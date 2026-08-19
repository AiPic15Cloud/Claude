export type RiskTier = 'SAFE' | 'WATCH' | 'HIGH';

const TIER_RANK: Record<RiskTier, number> = { SAFE: 0, WATCH: 1, HIGH: 2 };

// Mêmes seuils 40/70 que ScoreBadge (Score ATLAS) — couleurs inversées, ici
// un score haut est mauvais alors que pour Score ATLAS un score haut est bon.
export function riskTier(score: number): RiskTier {
  if (score >= 70) return 'HIGH';
  if (score >= 40) return 'WATCH';
  return 'SAFE';
}

export function tierRank(tier: RiskTier): number {
  return TIER_RANK[tier];
}
