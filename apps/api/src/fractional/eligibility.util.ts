/**
 * Éligibilité vs. hurdle plateforme (spec V3 §16.1 min_net_investor_yield).
 * Version P0 simplifiée : compare le Secured Net Yield (le plus conservateur
 * des deux, cf. returns.util.ts) au hurdle — pas le workflow complet de l'IC
 * Engine (hard stops, conditions, statuts APPROVE/HOLD/DECLINE), explicitement
 * P1 (roadmap spec §28, "P1 – Risque : ... IC Engine").
 */

export type EligibilityVerdict = 'ELIGIBLE' | 'MARGINAL' | 'INELIGIBLE' | 'NOT_EVALUABLE';

// Distingue les deux causes distinctes de NOT_EVALUABLE — sans ça, le label
// affiché à l'utilisateur ne peut nommer qu'une seule raison alors qu'il y en
// a deux (spec Cockpit/Fractionné §2 : un `0%` fabriqué en l'absence de
// profil plateforme ne doit jamais être confondu avec une collecte non
// renseignée, ni avec un vrai hurdle à 0%).
export type EligibilityNotEvaluableReason = 'NO_PLATFORM_PROFILE' | 'NO_COLLECTE';

export interface EligibilityResult {
  verdict: EligibilityVerdict;
  hurdlePct: number | null;
  securedNetYieldPct: number | null;
  gapPct: number | null;
  notEvaluableReason: EligibilityNotEvaluableReason | null;
}

const MARGINAL_BAND_PCT = 0.5;

/**
 * `hurdlePct: null` — aucun profil plateforme rattaché au dossier (spec
 * Cockpit/Fractionné §2, "corriger le hurdle à 0% sans profil") : un `0`
 * fabriqué ici serait lu comme un hurdle réellement nul et ferait ressortir
 * un verdict ELIGIBLE/INELIGIBLE — donc potentiellement un DECLINE IC Engine
 * — pour une simple absence de profil, jamais une évaluation réelle.
 *
 * `securedNetYieldPct: null` — appelant n'a pas encore renseigné la collecte
 * (`collecteMontant`, `@default(0)` en base, un état de dossier réel et
 * atteignable). Un 0% fabriqué à cet endroit serait lu comme un rendement
 * réellement nul et ferait ressortir un verdict INELIGIBLE — donc un DECLINE
 * IC Engine — pour un simple champ manquant (doctrine "Unknown ≠ Zero").
 */
export function computeEligibility(securedNetYieldPct: number | null, hurdlePct: number | null): EligibilityResult {
  if (hurdlePct === null) {
    return { verdict: 'NOT_EVALUABLE', hurdlePct: null, securedNetYieldPct, gapPct: null, notEvaluableReason: 'NO_PLATFORM_PROFILE' };
  }
  if (securedNetYieldPct === null) {
    return { verdict: 'NOT_EVALUABLE', hurdlePct, securedNetYieldPct: null, gapPct: null, notEvaluableReason: 'NO_COLLECTE' };
  }
  const gapPct = securedNetYieldPct - hurdlePct;
  const verdict: EligibilityVerdict = gapPct >= MARGINAL_BAND_PCT ? 'ELIGIBLE' : gapPct >= -MARGINAL_BAND_PCT ? 'MARGINAL' : 'INELIGIBLE';
  return { verdict, hurdlePct, securedNetYieldPct, gapPct, notEvaluableReason: null };
}
