import { Injectable } from '@nestjs/common';
import type { DealSurveillanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { RISK_MODEL_VERSION } from './risk-model-version';

export interface SnapshotInput {
  qualityScore: number;
  performanceScore: number;
  ewsScore: number;
  compositeScore: number;
  surveillanceStatus: DealSurveillanceStatus;
  breakdown: Prisma.InputJsonValue;
}

export interface RiskDeltas {
  d7: number | null;
  d30: number | null;
  d90: number | null;
}

const DAY_MS = 86_400_000;

/**
 * Historique append-only — jamais écrasé, contrairement à Deal.riskScore et
 * consorts qui ne gardent que la dernière valeur connue. Alimente
 * Δ7j/Δ30j/Δ90j, la trajectoire, et l'explicabilité (breakdown JSON complet
 * par instant).
 */
@Injectable()
export class RiskHistoryService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * N'insère un snapshot que si le tuple de scores/statut a réellement
   * changé depuis le dernier — sinon le filet de sécurité 6h sur tous les
   * dossiers actifs gonflerait la table sans information nouvelle, même
   * logique que maybeAlert() qui ne fait rien si rien n'a changé.
   */
  async maybeSnapshot(organizationId: string, dealId: string, computed: SnapshotInput, trigger: string): Promise<void> {
    const last = await this.prisma.riskScoreSnapshot.findFirst({
      where: { dealId },
      orderBy: { computedAt: 'desc' },
      select: { qualityScore: true, performanceScore: true, ewsScore: true, compositeScore: true, surveillanceStatus: true },
    });

    const unchanged =
      last !== null &&
      last.qualityScore === computed.qualityScore &&
      last.performanceScore === computed.performanceScore &&
      last.ewsScore === computed.ewsScore &&
      last.compositeScore === computed.compositeScore &&
      last.surveillanceStatus === computed.surveillanceStatus;

    if (unchanged) return;

    await this.prisma.riskScoreSnapshot.create({
      data: {
        organizationId,
        dealId,
        qualityScore: computed.qualityScore,
        performanceScore: computed.performanceScore,
        ewsScore: computed.ewsScore,
        compositeScore: computed.compositeScore,
        surveillanceStatus: computed.surveillanceStatus,
        breakdown: computed.breakdown,
        trigger,
        modelVersion: RISK_MODEL_VERSION,
      },
    });
  }

  /**
   * Pour chaque fenêtre, cherche le snapshot le plus récent "au moins N jours
   * avant maintenant" (jamais "le plus proche"), pour éviter le bruit du jour
   * même — un recalcul qui vient d'avoir lieu ne doit pas fausser un Δ90j.
   */
  async getDeltas(dealId: string, currentComposite: number, now: Date = new Date()): Promise<RiskDeltas> {
    const [d7, d30, d90] = await Promise.all([7, 30, 90].map((days) => this.compositeAtOrBefore(dealId, new Date(now.getTime() - days * DAY_MS))));
    return {
      d7: d7 === null ? null : currentComposite - d7,
      d30: d30 === null ? null : currentComposite - d30,
      d90: d90 === null ? null : currentComposite - d90,
    };
  }

  private async compositeAtOrBefore(dealId: string, cutoff: Date): Promise<number | null> {
    const snapshot = await this.prisma.riskScoreSnapshot.findFirst({
      where: { dealId, computedAt: { lte: cutoff } },
      orderBy: { computedAt: 'desc' },
      select: { compositeScore: true },
    });
    return snapshot?.compositeScore ?? null;
  }

  async getTrajectory(organizationId: string, dealId: string, sinceDays: number) {
    const since = new Date(Date.now() - sinceDays * DAY_MS);
    return this.prisma.riskScoreSnapshot.findMany({
      where: { organizationId, dealId, computedAt: { gte: since } },
      orderBy: { computedAt: 'asc' },
      select: { computedAt: true, compositeScore: true, qualityScore: true, performanceScore: true, ewsScore: true, surveillanceStatus: true },
    });
  }
}
