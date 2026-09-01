import { Injectable, NotFoundException } from '@nestjs/common';
import type { RelationshipCoverage } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { computeCrd } from '../deals/crd.util';

export interface EntitySummary {
  coverage: RelationshipCoverage;
  relationsCount: number;
  informationConfidence: RelationshipCoverage | null;
  lastVerifiedAt: string | null;
  exposureDirect: number | null;
  operationsActive: number;
  operationsRepaid: number;
  guaranteesSharedCount: number;
  groupEconomique: { id: string; name: string }[];
  exposureConsolidated: number | null;
  distressedLinked: { id: string; name: string; reason: string }[];
}

/// Ordre du plancher de confiance (0.2) — jamais surclasser une fiche sur sa relation la plus faible.
const COVERAGE_RANK: Record<RelationshipCoverage, number> = { UNKNOWN: 0, PARTIAL: 1, SUBSTANTIAL: 2, VERIFIED: 3 };

const DISTRESSED_PORTEUR_STATUSES = new Set(['procedure_collective', 'fermee']);
const DISTRESSED_RECOVERY_STATUSES = new Set(['MISE_EN_DEMEURE', 'CONTENTIEUX', 'PROCEDURE_COLLECTIVE']);

/**
 * Requêtes déterministes de premier niveau sur le Knowledge Graph v2 (spec
 * ATLAS v2, B.3) : groupe économique, garanties partagées, sociétés liées à
 * une procédure collective, exposition consolidée. Traversée simple à un
 * saut (entité + sœurs de groupe économique) — pas d'algorithme récursif
 * générique, la spec réserve explicitement la traversée multi-niveaux à B.4/B.5.
 * Séparé de RelationshipsService, qui ne fait que lire/écrire le modèle sans
 * dérivation.
 */
@Injectable()
export class EntityIntelligenceService {
  constructor(private readonly prisma: PrismaService) {}

  async getSummary(organizationId: string, entityId: string): Promise<EntitySummary> {
    const entity = await this.prisma.entity.findFirst({ where: { id: entityId, organizationId } });
    if (!entity) throw new NotFoundException('Entité introuvable');

    const relationships = await this.prisma.relationship.findMany({
      where: { organizationId, OR: [{ sourceEntityId: entityId }, { targetEntityId: entityId }] },
      include: {
        sourceEntity: { select: { id: true, name: true, type: true, mirrorsDealId: true } },
        targetEntity: { select: { id: true, name: true, type: true, mirrorsDealId: true } },
        evidence: { select: { createdAt: true } },
      },
    });

    const otherSide = (r: (typeof relationships)[number]) => (r.sourceEntityId === entityId ? r.targetEntity : r.sourceEntity);

    const groupEconomique = relationships
      .filter((r) => r.typeKey === 'GROUPE_ECONOMIQUE')
      .map((r) => otherSide(r))
      .map((e) => ({ id: e.id, name: e.name }));

    const guaranteesSharedCount = relationships.filter((r) => r.typeKey === 'CAUTION_PARTAGEE').length;

    const informationConfidence =
      relationships.length === 0
        ? null
        : relationships.reduce<RelationshipCoverage>(
            (min, r) => (COVERAGE_RANK[r.confidence] < COVERAGE_RANK[min] ? r.confidence : min),
            relationships[0].confidence,
          );

    const verifiedTimestamps = relationships.flatMap((r) => [
      r.verifiedAt,
      ...r.evidence.map((e) => e.createdAt),
    ]).filter((d): d is Date => d !== null);
    const lastVerifiedAt = verifiedTimestamps.length > 0 ? new Date(Math.max(...verifiedTimestamps.map((d) => d.getTime()))) : null;

    // Opérations liées à 1 saut : celles de l'entité elle-même (exposition
    // directe), plus celles de ses sœurs de groupe économique (exposition
    // consolidée) — un second aller simple, pas une récursion générique.
    const directDealIds = new Set<string>();
    for (const r of relationships) {
      const other = otherSide(r);
      if (other.mirrorsDealId) directDealIds.add(other.mirrorsDealId);
    }

    const consolidatedDealIds = new Set(directDealIds);
    if (groupEconomique.length > 0) {
      const siblingRelationships = await this.prisma.relationship.findMany({
        where: {
          organizationId,
          OR: [{ sourceEntityId: { in: groupEconomique.map((g) => g.id) } }, { targetEntityId: { in: groupEconomique.map((g) => g.id) } }],
        },
        include: {
          sourceEntity: { select: { mirrorsDealId: true } },
          targetEntity: { select: { mirrorsDealId: true } },
        },
      });
      for (const r of siblingRelationships) {
        if (r.sourceEntity.mirrorsDealId) consolidatedDealIds.add(r.sourceEntity.mirrorsDealId);
        if (r.targetEntity.mirrorsDealId) consolidatedDealIds.add(r.targetEntity.mirrorsDealId);
      }
    }

    const allDealIds = Array.from(consolidatedDealIds);
    const deals =
      allDealIds.length === 0
        ? []
        : await this.prisma.deal.findMany({
            where: { id: { in: allDealIds }, organizationId },
            select: {
              id: true,
              name: true,
              amountRaised: true,
              repaid: true,
              stage: true,
              porteurMonitoringStatus: true,
              recoveryStatus: true,
            },
          });

    const realizedSums =
      allDealIds.length === 0
        ? []
        : await this.prisma.repayment.groupBy({
            by: ['dealId'],
            where: { dealId: { in: allDealIds }, projected: false },
            _sum: { amount: true },
          });
    const realizedByDeal = new Map(realizedSums.map((s) => [s.dealId, Number(s._sum.amount ?? 0)]));
    const crdByDeal = new Map(deals.map((d) => [d.id, computeCrd(Number(d.amountRaised), realizedByDeal.get(d.id) ?? 0)]));

    const isRepaidDeal = (d: (typeof deals)[number]) => d.repaid || d.stage === 'REMBOURSE' || d.stage === 'DEFAUT';
    const directDeals = deals.filter((d) => directDealIds.has(d.id));
    const operationsActive = directDeals.filter((d) => !isRepaidDeal(d)).length;
    const operationsRepaid = directDeals.filter((d) => isRepaidDeal(d)).length;

    const exposureDirect = directDeals.length > 0 ? directDeals.reduce((sum, d) => sum + (crdByDeal.get(d.id) ?? 0), 0) : null;
    const exposureConsolidated = deals.length > 0 ? deals.reduce((sum, d) => sum + (crdByDeal.get(d.id) ?? 0), 0) : null;

    const distressedLinked = deals
      .filter(
        (d) =>
          (d.porteurMonitoringStatus && DISTRESSED_PORTEUR_STATUSES.has(d.porteurMonitoringStatus)) ||
          (d.recoveryStatus && DISTRESSED_RECOVERY_STATUSES.has(d.recoveryStatus)),
      )
      .map((d) => ({
        id: d.id,
        name: d.name,
        reason:
          d.porteurMonitoringStatus && DISTRESSED_PORTEUR_STATUSES.has(d.porteurMonitoringStatus)
            ? 'Porteur en procédure collective ou société fermée'
            : 'Recouvrement en contentieux ou procédure collective',
      }));

    return {
      coverage: entity.coverage,
      relationsCount: relationships.length,
      informationConfidence,
      lastVerifiedAt: lastVerifiedAt ? lastVerifiedAt.toISOString() : null,
      exposureDirect,
      operationsActive,
      operationsRepaid,
      guaranteesSharedCount,
      groupEconomique,
      exposureConsolidated,
      distressedLinked,
    };
  }
}
