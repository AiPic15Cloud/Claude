import type { GraphEntity } from '@/types';
import type { PlatformMetadata } from './platform-metadata';

export interface MarketBenchmark {
  platformCount: number;
  withDataCount: number;
  totalFundedSum: number | null;
  totalRiskAmountSum: number | null;
  weightedRiskRatePct: number | null;
  weightedExternalScore: number | null;
  dynamismCounts: { CROISSANCE: number; STABLE: number; RALENTISSEMENT: number; nonRenseigne: number };
}

/**
 * Repère marché global (spec ATLAS v2, complément baromètre-crowdfunding.com,
 * point NEXT de la table de priorisation E) — agrégation pure des métadonnées
 * déjà collectées par platforms-sync.service.ts (E.3/E.4), aucune nouvelle
 * source de données. Pondération par capital financé (totalFunded), même
 * doctrine que le score de risque pondéré par CRD du dashboard portefeuille
 * (F.2) : une plateforme avec 50M€ financés pèse plus dans la moyenne qu'une
 * plateforme avec 500k€.
 */
export function computeMarketBenchmark(platforms: GraphEntity[]): MarketBenchmark {
  let totalFundedSum = 0;
  let totalRiskAmountSum = 0;
  let riskWeightSum = 0;
  let scoreWeightedSum = 0;
  let scoreWeightSum = 0;
  let withDataCount = 0;
  const dynamismCounts = { CROISSANCE: 0, STABLE: 0, RALENTISSEMENT: 0, nonRenseigne: 0 };

  for (const platform of platforms) {
    const meta = (platform.metadata ?? {}) as PlatformMetadata;
    if (meta.totalFunded != null) {
      withDataCount += 1;
      totalFundedSum += meta.totalFunded;
      if (meta.riskAmount != null) {
        totalRiskAmountSum += meta.riskAmount;
        riskWeightSum += meta.totalFunded;
      }
      if (meta.externalScore != null) {
        scoreWeightedSum += meta.externalScore * meta.totalFunded;
        scoreWeightSum += meta.totalFunded;
      }
    }
    if (meta.dynamism) {
      dynamismCounts[meta.dynamism] += 1;
    } else {
      dynamismCounts.nonRenseigne += 1;
    }
  }

  return {
    platformCount: platforms.length,
    withDataCount,
    totalFundedSum: withDataCount > 0 ? totalFundedSum : null,
    totalRiskAmountSum: riskWeightSum > 0 ? totalRiskAmountSum : null,
    weightedRiskRatePct: riskWeightSum > 0 ? Math.round((totalRiskAmountSum / riskWeightSum) * 1000) / 10 : null,
    weightedExternalScore: scoreWeightSum > 0 ? Math.round((scoreWeightedSum / scoreWeightSum) * 10) / 10 : null,
    dynamismCounts,
  };
}
