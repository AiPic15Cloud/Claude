import { Injectable, Logger } from '@nestjs/common';
import type { ContagionProximity, LegalEventType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { TasksService } from '../tasks/tasks.service';
import { EntityIntelligenceService } from './entity-intelligence.service';
import { GroupBuilderService } from './group-builder.service';

const DAY_MS = 86_400_000;
const TITLE_PREFIX = 'Contagion à revoir';

const LEGAL_EVENT_LABELS: Record<LegalEventType, string> = {
  REDRESSEMENT_JUDICIAIRE: 'redressement judiciaire',
  LIQUIDATION_JUDICIAIRE: 'liquidation judiciaire',
  SAUVEGARDE: 'procédure de sauvegarde',
  DISSOLUTION: 'dissolution',
  RADIATION: 'radiation',
  CHANGEMENT_DIRIGEANT: 'changement de dirigeant',
  CHANGEMENT_CONTROLE: 'changement de contrôle',
  AUTRE: 'événement juridique',
};

/**
 * Contagion niveau 1 (spec ATLAS v2, B.4) — pas un nouvel algorithme de
 * traversée : réutilise EntityIntelligenceService.getSummary() (B.3, déjà
 * "relations directes → exposition liée → opérations concernées") et se
 * contente d'automatiser son déclenchement sur un événement critique, plus
 * de produire l'artefact de revue humaine que B.3 ne produisait pas (B.3
 * n'était qu'une consultation passive à l'ouverture d'une fiche entité).
 *
 * Silence total si aucun signal réel (graphe non couvert ou sans lien
 * documenté) — jamais une alerte fabriquée sur un graphe vide (doctrine 0.2,
 * garde-fou B.5).
 */
@Injectable()
export class ContagionService {
  private readonly logger = new Logger(ContagionService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityIntelligence: EntityIntelligenceService,
    private readonly groupBuilder: GroupBuilderService,
    private readonly alerts: AlertsService,
    private readonly tasks: TasksService,
  ) {}

  async listForDeal(organizationId: string, dealId: string) {
    return this.prisma.contagionSignal.findMany({
      where: { organizationId, dealId },
      include: { sourceEntity: { select: { id: true, name: true } }, legalEvent: true, financialEvent: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async checkContagion(organizationId: string, dealId: string, reason: string): Promise<void> {
    const link = await this.prisma.dealEntityLink.findFirst({
      where: { dealId, role: 'PROMOTEUR' },
      select: { entityId: true },
    });
    if (!link) return;

    // DealEntityLink.entityId est un id GraphEntity (v1) ; l'entité miroir
    // v2 réutilise le même id (voir EntityMirrorService.createGraphEntityMirror
    // et schema.prisma, commentaire sur Entity.id) — pas de table de mapping.
    const summary = await this.entityIntelligence.getSummary(organizationId, link.entityId).catch(() => null);
    if (!summary) return;

    const additionalExposure = (summary.exposureConsolidated ?? 0) - (summary.exposureDirect ?? 0);
    if (additionalExposure <= 0 && summary.distressedLinked.length === 0) return;

    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { reference: true, name: true, assignedToId: true, createdById: true },
    });
    if (!deal) return;

    const title = `${TITLE_PREFIX} — ${deal.reference}`;
    const existing = await this.prisma.alert.findFirst({ where: { organizationId, dealId, title } });
    if (existing) return;

    const messageParts = [`${deal.name} (${reason}).`];
    if (summary.groupEconomique.length > 0) {
      messageParts.push(`${summary.groupEconomique.length} entité(s) du même groupe économique.`);
    }
    if (additionalExposure > 0) {
      messageParts.push(`Exposition additionnelle liée : ${Math.round(additionalExposure).toLocaleString('fr-FR')} €.`);
    }
    if (summary.distressedLinked.length > 0) {
      messageParts.push(
        `Dossier(s) lié(s) déjà en difficulté : ${summary.distressedLinked.map((d) => d.name).join(', ')}.`,
      );
    }
    const message = messageParts.join(' ');

    await this.alerts.create(organizationId, { title, message, severity: 'CRITICAL', dealId });

    const assigneeId = deal.assignedToId ?? deal.createdById;
    await this.tasks.create(organizationId, assigneeId, {
      title,
      dealId,
      priority: 'URGENT',
      dueDate: new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10),
      assigneeId,
    });

    this.logger.log(`Signal de contagion détecté pour le dossier ${deal.reference} (${reason}).`);
  }

  /**
   * Contagion niveau 2 (spec V2, §10) — déclenché par un événement sur une
   * entité précise (LegalEvent/FinancialEvent), pas par le score de risque
   * d'un dossier : parcourt le groupe économique complet de l'entité
   * affectée (GroupBuilderService, transitif) et persiste un ContagionSignal
   * explicable par dossier concerné, jamais une simple alerte non tracée.
   * Une alerte forte (Alert + Task) n'est créée que si la contagion est
   * démontrée ou l'exposition additionnelle est matérielle — un lien
   * faiblement ou historiquement lié ne doit jamais réveiller le téléphone
   * (doctrine non négociable, spec V2 §17.11).
   */
  async evaluateEntityEvent(
    organizationId: string,
    affectedEntityId: string,
    origin: { legalEventId?: string; financialEventId?: string; reason: string },
  ) {
    const groupIds = await this.groupBuilder.getGroupEntityIds(organizationId, affectedEntityId);
    const relevantEntityIds = [affectedEntityId, ...groupIds];

    const links = await this.prisma.dealEntityLink.findMany({
      where: { role: 'PROMOTEUR', entityId: { in: relevantEntityIds }, deal: { organizationId } },
      select: {
        entityId: true,
        deal: { select: { id: true, reference: true, name: true, assignedToId: true, createdById: true } },
      },
    });
    if (links.length === 0) return [];

    const affectedEntity = await this.prisma.entity.findUnique({ where: { id: affectedEntityId }, select: { name: true } });
    const legalEvent = origin.legalEventId
      ? await this.prisma.legalEvent.findUnique({ where: { id: origin.legalEventId }, select: { type: true } })
      : null;

    const signals = [];
    for (const link of links) {
      const promoteurEntityId = link.entityId;
      const proximity: ContagionProximity = promoteurEntityId === affectedEntityId ? 'DIRECT' : 'CONTROLE_GROUPE';

      let contagionDemonstrated = proximity === 'DIRECT';
      if (!contagionDemonstrated) {
        const sharedGuarantee = await this.prisma.relationship.findFirst({
          where: {
            organizationId,
            typeKey: 'CAUTION_PARTAGEE',
            status: 'ACTIVE',
            OR: [
              { sourceEntityId: affectedEntityId, targetEntityId: promoteurEntityId },
              { sourceEntityId: promoteurEntityId, targetEntityId: affectedEntityId },
            ],
          },
        });
        contagionDemonstrated = !!sharedGuarantee;
      }

      const alreadySignaled = await this.prisma.contagionSignal.findFirst({
        where: {
          organizationId,
          dealId: link.deal.id,
          sourceEntityId: affectedEntityId,
          status: 'OPEN',
          legalEventId: origin.legalEventId ?? null,
          financialEventId: origin.financialEventId ?? null,
        },
      });
      if (alreadySignaled) {
        signals.push(alreadySignaled);
        continue;
      }

      let additionalExposure: number | null = null;
      if (proximity === 'CONTROLE_GROUPE') {
        const summary = await this.entityIntelligence.getSummary(organizationId, promoteurEntityId).catch(() => null);
        if (summary) additionalExposure = (summary.exposureConsolidated ?? 0) - (summary.exposureDirect ?? 0);
      }

      const explanation = this.buildExplanation({
        affectedName: affectedEntity?.name ?? 'Entité liée',
        dealName: link.deal.name,
        eventLabel: legalEvent ? LEGAL_EVENT_LABELS[legalEvent.type] : origin.reason,
        proximity,
        contagionDemonstrated,
        additionalExposure,
      });

      const signal = await this.prisma.contagionSignal.create({
        data: {
          organizationId,
          dealId: link.deal.id,
          sourceEntityId: affectedEntityId,
          legalEventId: origin.legalEventId,
          financialEventId: origin.financialEventId,
          proximity,
          contagionDemonstrated,
          additionalExposure: additionalExposure !== null ? additionalExposure : undefined,
          explanation,
        },
      });
      signals.push(signal);

      if (contagionDemonstrated || (additionalExposure ?? 0) > 0) {
        const title = `${TITLE_PREFIX} — ${link.deal.reference}`;
        const existingAlert = await this.prisma.alert.findFirst({ where: { organizationId, dealId: link.deal.id, title } });
        if (!existingAlert) {
          await this.alerts.create(organizationId, { title, message: explanation, severity: 'CRITICAL', dealId: link.deal.id });
          const assigneeId = link.deal.assignedToId ?? link.deal.createdById;
          await this.tasks.create(organizationId, assigneeId, {
            title,
            dealId: link.deal.id,
            priority: 'URGENT',
            dueDate: new Date(Date.now() + 3 * DAY_MS).toISOString().slice(0, 10),
            assigneeId,
          });
        }
      } else {
        this.logger.log(`Signal de contagion (${proximity}, non démontré) pour le dossier ${link.deal.reference} — pas d'alerte forte.`);
      }
    }

    return signals;
  }

  private buildExplanation(input: {
    affectedName: string;
    dealName: string;
    eventLabel: string;
    proximity: ContagionProximity;
    contagionDemonstrated: boolean;
    additionalExposure: number | null;
  }): string {
    const parts = [`Une entité liée à ${input.affectedName} a été concernée par : ${input.eventLabel}.`];
    parts.push(
      input.proximity === 'DIRECT'
        ? `Cette entité porte directement l'opération ${input.dealName}.`
        : `Le lien avec ${input.dealName} repose sur un contrôle/groupe économique commun.`,
    );
    if (input.additionalExposure !== null && input.additionalExposure > 0) {
      parts.push(`Exposition additionnelle liée au groupe : ${Math.round(input.additionalExposure).toLocaleString('fr-FR')} €.`);
    }
    parts.push(
      input.contagionDemonstrated
        ? "Impact : contagion directe au projet, réévaluation du risque opérateur nécessaire."
        : "Aucune garantie croisée ou flux financier démontré — la contagion directe au projet n'est pas établie, à recontextualiser.",
    );
    return parts.join(' ');
  }
}
