import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';

/**
 * Reverse Solver (spec V3 §19). P0 implémente 2 des 8 variables cibles de
 * la spec — prix maximum et loyer minimum, les deux plus directement
 * actionnables en phase de négociation — pas les 6 autres (frais maximum,
 * vacance maximale, CAPEX maximum, exit yield maximum, part investisseurs,
 * baux à sécuriser), différées à un lot ultérieur. Chacune bissecte sur
 * `computeReturnsEngine` comme boîte noire plutôt que d'inverser
 * algébriquement le modèle — robuste aux évolutions futures du moteur, au
 * prix d'un calcul un peu plus coûteux (~40 évaluations, négligeable).
 */

const MAX_ITERATIONS = 60;
const TOLERANCE_PCT = 0.01;

export interface ReverseSolverResult {
  /** null si le hurdle est déjà hors de portée même aux bornes de la recherche. */
  value: number | null;
  achievedYieldPct: number | null;
  iterations: number;
}

function bisect(lowValue: number, highValue: number, targetHurdlePct: number, yieldAt: (value: number) => number, decreasing: boolean): ReverseSolverResult {
  let low = lowValue;
  let high = highValue;
  const yieldLow = yieldAt(low);
  const yieldHigh = yieldAt(high);

  // yieldAt doit être monotone décroissante en `value` (prix ↑ ⇒ yield ↓) ou
  // croissante (loyer ↑ ⇒ yield ↑) selon `decreasing` — sinon pas de racine unique.
  const boundsBracketTarget = decreasing ? yieldLow >= targetHurdlePct && yieldHigh <= targetHurdlePct : yieldLow <= targetHurdlePct && yieldHigh >= targetHurdlePct;
  if (!boundsBracketTarget) {
    const achievable = decreasing ? Math.max(yieldLow, yieldHigh) : Math.max(yieldLow, yieldHigh);
    return { value: null, achievedYieldPct: achievable, iterations: 0 };
  }

  let mid = (low + high) / 2;
  let iterations = 0;
  for (; iterations < MAX_ITERATIONS; iterations++) {
    mid = (low + high) / 2;
    const yieldMid = yieldAt(mid);
    if (Math.abs(yieldMid - targetHurdlePct) < TOLERANCE_PCT) break;
    const goLower = decreasing ? yieldMid < targetHurdlePct : yieldMid > targetHurdlePct;
    if (goLower) high = mid;
    else low = mid;
  }

  return { value: mid, achievedYieldPct: yieldAt(mid), iterations };
}

/** Prix d'acquisition maximum compatible avec le hurdle — droits/honoraires conservés fixes, seul prixNetVendeur varie. */
export function solveMaxAcquisitionPrice(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const yieldAt = (price: number) =>
    computeReturnsEngine({ ...base, sourcesUses: { ...base.sourcesUses, prixNetVendeur: price } }).securedNetYieldPct;
  return bisect(base.sourcesUses.prixNetVendeur * 0.1, base.sourcesUses.prixNetVendeur * 3, targetHurdlePct, yieldAt, true);
}

/** Loyer total minimum (mise à l'échelle uniforme de tous les baux) compatible avec le hurdle, prix fixé. */
export function solveMinSecuredRent(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const baseTotalLoyer = base.leases.reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);
  const yieldAtFactor = (factor: number) =>
    computeReturnsEngine({ ...base, leases: base.leases.map((l) => ({ ...l, loyerFacialAnnuel: l.loyerFacialAnnuel * factor })) }).securedNetYieldPct;

  const result = bisect(0.1, 3, targetHurdlePct, yieldAtFactor, false);
  return { value: result.value === null ? null : result.value * baseTotalLoyer, achievedYieldPct: result.achievedYieldPct, iterations: result.iterations };
}
