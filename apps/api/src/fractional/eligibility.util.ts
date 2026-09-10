/**
 * Éligibilité vs. hurdle plateforme (spec V3 §16.1 min_net_investor_yield).
 * Version P0 simplifiée : compare le Secured Net Yield (le plus conservateur
 * des deux, cf. returns.util.ts) au hurdle — pas le workflow complet de l'IC
 * Engine (hard stops, conditions, statuts APPROVE/HOLD/DECLINE), explicitement
 * P1 (roadmap spec §28, "P1 – Risque : ... IC Engine").
 */

export type EligibilityVerdict = 'ELIGIBLE' | 'MARGINAL' | 'INELIGIBLE';

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  hurdlePct: number;
  securedNetYieldPct: number;
  gapPct: number;
}

const MARGINAL_BAND_PCT = 0.5;

export function computeEligibility(securedNetYieldPct: number, hurdlePct: number): EligibilityResult {
  const gapPct = securedNetYieldPct - hurdlePct;
  const verdict: EligibilityVerdict = gapPct >= MARGINAL_BAND_PCT ? 'ELIGIBLE' : gapPct >= -MARGINAL_BAND_PCT ? 'MARGINAL' : 'INELIGIBLE';
  return { verdict, hurdlePct, securedNetYieldPct, gapPct };
}
