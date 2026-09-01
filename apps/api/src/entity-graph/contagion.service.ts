import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { TasksService } from '../tasks/tasks.service';
import { EntityIntelligenceService } from './entity-intelligence.service';

const DAY_MS = 86_400_000;
const TITLE_PREFIX = 'Contagion à revoir';

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
    private readonly alerts: AlertsService,
    private readonly tasks: TasksService,
  ) {}

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
}
