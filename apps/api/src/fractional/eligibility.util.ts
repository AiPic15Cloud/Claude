/**
 * Éligibilité vs. hurdle plateforme (spec V3 §16.1 min_net_investor_yield).
 * Version P0 simplifiée : compare le Secured Net Yield (le plus conservateur
 * des deux, cf. returns.util.ts) au hurdle — pas le workflow complet de l'IC
 * Engine (hard stops, conditions, statuts APPROVE/HOLD/DECLINE), explicitement
 * P1 (roadmap spec §28, "P1 – Risque : ... IC Engine").
 */

export type EligibilityVerdict = 'ELIGIBLE' | 'MARGINAL' | 'INELIGIBLE' | 'NOT_EVALUABLE';

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  hurdlePct: number;
  securedNetYieldPct: number | null;
  gapPct: number | null;
}

const MARGINAL_BAND_PCT = 0.5;

/**
 * `securedNetYieldPct: null` — appelant n'a pas encore renseigné la collecte
 * (`collecteMontant`, `@default(0)` en base, un état de dossier réel et
 * atteignable). Un 0% fabriqué à cet endroit serait lu comme un rendement
 * réellement nul et ferait ressortir un verdict INELIGIBLE — donc un DECLINE
 * IC Engine — pour un simple champ manquant (doctrine "Unknown ≠ Zero").
 */
export function computeEligibility(securedNetYieldPct: number | null, hurdlePct: number): EligibilityResult {
  if (securedNetYieldPct === null) {
    return { verdict: 'NOT_EVALUABLE', hurdlePct, securedNetYieldPct: null, gapPct: null };
  }
  const gapPct = securedNetYieldPct - hurdlePct;
  const verdict: EligibilityVerdict = gapPct >= MARGINAL_BAND_PCT ? 'ELIGIBLE' : gapPct >= -MARGINAL_BAND_PCT ? 'MARGINAL' : 'INELIGIBLE';
  return { verdict, hurdlePct, securedNetYieldPct, gapPct };
}
