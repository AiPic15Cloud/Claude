import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { EntityResolutionService } from '../entity-graph/entity-resolution.service';
import { NOTIFICATION_QUEUE, notifyEntityMatchJobId } from './crowdfunding-watch.constants';

const CROWDFUNDING_RELATIONSHIP_TYPE_KEY = 'CROWDFUNDING_OBSERVED_LINK';

/**
 * Rapprochement entre une observation de marché et les entités Atlas (spec
 * §4) — réutilise EntityResolutionService tel quel plutôt que de
 * réimplémenter une logique de correspondance. La file
 * ProjectObservationEntityLink porte à la fois les suggestions à valider et
 * les liens confirmés ; l'absence de toute ligne pour une observation dont
 * `enrichedAt` est posé signifie "aucun lien identifié", jamais une
 * certitude d'absence de lien (spec §4, verbatim).
 */
@Injectable()
export class EntityLinkReviewService {
  private readonly logger = new Logger(EntityLinkReviewService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly entityResolution: EntityResolutionService,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  /** Appelé par EnrichmentProcessor — un passage par organisation, jamais par tenant implicite (une observation de marché est un fait global, cf. ProjectObservation). */
  async enrichObservation(observationId: string): Promise<void> {
    const observation = await this.prisma.projectObservation.findUnique({ where: { id: observationId } });
    if (!observation) return;

    if (!observation.operatorRaw) {
      // Rien à rapprocher — une opérateur non identifié ne doit jamais devenir un rapprochement inventé.
      await this.prisma.projectObservation.update({ where: { id: observationId }, data: { enrichedAt: new Date() } });
      return;
    }

    // Une observation de marché n'est jamais scopée à une organisation en
    // particulier (fait global, cf. commentaire sur enrichObservation
    // ci-dessus) : impossible de restreindre la boucle à un sous-ensemble
    // d'organisations sans réintroduire l'hypothèse inverse. Chaque
    // résolution reste indépendante (un rapprochement par organisation, table
    // ProjectObservationEntityLink dédupliquée par (observationId,
    // organizationId, entityId)), donc paralléliser ne change aucun résultat
    // — seulement le temps total, qui passait de O(organisations) écritures
    // séquentielles à une seule vague concurrente.
    const organizations = await this.prisma.organization.findMany({ select: { id: true } });
    await Promise.all(organizations.map((organization) => this.resolveForOrganization(organization.id, observation.id, observation.operatorRaw!)));
    await this.prisma.projectObservation.update({ where: { id: observationId }, data: { enrichedAt: new Date() } });
  }

  private async resolveForOrganization(organizationId: string, observationId: string, operatorRaw: string): Promise<void> {
    const result = await this.entityResolution.resolveCompany(organizationId, {
      name: operatorRaw,
      type: 'PROMOTEUR',
      domain: 'MARKET',
      source: `crowdfunding-watch:${observationId}`,
      createIfNoMatch: false,
    });

    if (result.confidence === 'NONE') return; // aucune ligne créée — enrichedAt (posé par l'appelant) distingue "vérifié, rien trouvé" de "jamais vérifié".

    if (result.confidence === 'HIGH' && result.entity) {
      // Correspondance directe par SIREN — auto-confirmée, matérialisée immédiatement dans le Knowledge Graph v2 (spec §4 : "correspondance directe par identifiant légal").
      const link = await this.createLink(organizationId, observationId, result.entity.id, 'DIRECT_ID', 'HIGH', 'CONFIRMED');
      if (link.created) {
        const relationship = await this.materializeRelationship(organizationId, result.entity.id, observationId);
        await this.prisma.projectObservationEntityLink.update({ where: { id: link.id }, data: { relationshipId: relationship.id, reviewedAt: new Date() } });
        await this.notificationQueue.add(
          'notify-entity-match',
          { linkId: link.id },
          { jobId: notifyEntityMatchJobId(observationId, result.entity.id), removeOnComplete: true, removeOnFail: 200, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
      }
      return;
    }

    if (result.confidence === 'MEDIUM' && result.entity) {
      // Correspondance par nom seul — trop faible pour une auto-confirmation dans ce module (opérateur scrapé, potentiellement bruité) : reste SUGGESTED, validation humaine requise.
      await this.createLink(organizationId, observationId, result.entity.id, 'DOCUMENTED', 'MEDIUM', 'SUGGESTED');
      return;
    }

    if (result.confidence === 'LOW' && result.candidates.length > 0) {
      // Plusieurs candidats homonymes — une ligne par candidat, jamais de fusion automatique (spec §4 : "homonymie sans fusion abusive").
      for (const candidate of result.candidates) {
        await this.createLink(organizationId, observationId, candidate.id, 'POTENTIAL', 'LOW', 'SUGGESTED');
      }
    }
  }

  private async createLink(
    organizationId: string,
    observationId: string,
    entityId: string,
    matchType: 'DIRECT_ID' | 'DOCUMENTED' | 'POTENTIAL',
    confidence: 'HIGH' | 'MEDIUM' | 'LOW',
    status: 'SUGGESTED' | 'CONFIRMED',
  ): Promise<{ id: string; created: boolean }> {
    const existing = await this.prisma.projectObservationEntityLink.findUnique({
      where: { observationId_organizationId_entityId: { observationId, organizationId, entityId } },
    });
    if (existing) return { id: existing.id, created: false };

    const link = await this.prisma.projectObservationEntityLink.create({
      data: { organizationId, observationId, entityId, matchType, confidence, status },
    });
    return { id: link.id, created: true };
  }

  private async materializeRelationship(organizationId: string, entityId: string, observationId: string) {
    const observation = await this.prisma.projectObservation.findUniqueOrThrow({ where: { id: observationId } });
    // Miroir "opération de marché" côté Entity — id stable dérivable, jamais un cuid aléatoire, pour rester idempotent si ce chemin est rejoué.
    const marketEntityId = `crowdfunding_observation_${observation.id}`;
    await this.prisma.entity.upsert({
      where: { id: marketEntityId },
      update: {},
      create: {
        id: marketEntityId,
        organizationId,
        type: 'OPERATION',
        domain: 'MARKET',
        name: observation.projectName,
        description: observation.projectUrl,
        coverage: 'PARTIAL',
      },
    });

    // Id déterministe plutôt qu'un cuid aléatoire : ce chemin peut être appelé une seconde fois
    // (auto-confirmation SIREN puis confirmation manuelle d'un lien resté SUGGESTED) — upsert le
    // rend idempotent sans dupliquer la relation ni son Evidence.
    const relationshipId = `crowdfunding_link_${entityId}_${observation.id}`;
    return this.prisma.relationship.upsert({
      where: { id: relationshipId },
      update: {},
      create: {
        id: relationshipId,
        organizationId,
        sourceEntityId: entityId,
        targetEntityId: marketEntityId,
        typeKey: CROWDFUNDING_RELATIONSHIP_TYPE_KEY,
        confidence: 'PARTIAL',
        observedAt: observation.observedAt,
        evidence: {
          create: {
            level: 'DOCUMENTED',
            source: `crowdfunding-watch:${observation.sourceKey}`,
            reference: observation.projectUrl,
            note: 'Rapprochement automatique par SIREN (Entity Resolution Engine) — jamais une preuve d\'implication opérationnelle, seulement d\'identité.',
          },
        },
      },
    });
  }

  listForOrganization(organizationId: string, status?: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED', entityId?: string) {
    return this.prisma.projectObservationEntityLink.findMany({
      where: { organizationId, status, entityId },
      include: {
        observation: { select: { id: true, projectName: true, projectUrl: true, sourceKey: true, status: true } },
        entity: { select: { id: true, name: true, type: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async confirm(organizationId: string, linkId: string, userId: string) {
    const link = await this.getOwnedLink(organizationId, linkId);
    const relationship = link.relationshipId ? null : await this.materializeRelationship(organizationId, link.entityId, link.observationId);
    return this.prisma.projectObservationEntityLink.update({
      where: { id: linkId },
      data: { status: 'CONFIRMED', relationshipId: relationship?.id ?? link.relationshipId, reviewedById: userId, reviewedAt: new Date() },
    });
  }

  async reject(organizationId: string, linkId: string, userId: string, reason?: string) {
    await this.getOwnedLink(organizationId, linkId);
    return this.prisma.projectObservationEntityLink.update({
      where: { id: linkId },
      data: { status: 'REJECTED', reviewedById: userId, reviewedAt: new Date(), rejectionReason: reason },
    });
  }

  private async getOwnedLink(organizationId: string, linkId: string) {
    const link = await this.prisma.projectObservationEntityLink.findFirst({ where: { id: linkId, organizationId } });
    if (!link) throw new NotFoundException('Rapprochement introuvable');
    return link;
  }
}
