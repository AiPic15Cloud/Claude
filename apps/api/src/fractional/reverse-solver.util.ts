import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';

/**
 * Reverse Solver (spec V3 §19, 8 variables cibles). Frais maximum et part
 * investisseurs (carry) sont résolus séparément dans
 * stakeholder-waterfall.util.ts (solveMaxTotalFeeLoad/solveMaxCarry) ; exit
 * yield maximum est résolu dans exit-yield.util.ts
 * (solveMaxExitYieldExpansion, a besoin du yield de sortie explicite du Cap
 * Rate Build-Up, pas seulement de exitValue) — aucun n'est dupliqué ici.
 * Les leviers ci-dessous bissectent sur `computeReturnsEngine` comme boîte
 * noire plutôt que d'inverser algébriquement le modèle — robuste aux
 * évolutions futures du moteur, au prix d'un calcul un peu plus coûteux
 * (~40 évaluations, négligeable). Toutes ciblent le Secured Net Yield vs
 * hurdlePct, cohérent avec eligibility.util.ts.
 */

const MAX_ITERATIONS = 60;
const TOLERANCE_PCT = 0.01;

export interface ReverseSolverResult {
  /** null si le hurdle est déjà hors de portée même aux bornes de la recherche. */
  value: number | null;
  achievedYieldPct: number | null;
  iterations: number;
}

export function bisect(lowValue: number, highValue: number, targetHurdlePct: number, yieldAt: (value: number) => number, decreasing: boolean): ReverseSolverResult {
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

/**
 * Prix d'acquisition maximum compatible avec le hurdle — droits/honoraires
 * conservés fixes ; collecteMontant absorbe intégralement l'écart de prix
 * (le reste de la structure de financement — sponsor equity, dette — ne
 * bouge pas). Correctif : une version antérieure ne faisait varier que
 * prixNetVendeur en laissant collecteMontant fixe — or securedNetYieldPct
 * = distribution / collecte ne dépend structurellement PAS de
 * prixNetVendeur dans returns.util.ts (seuls les rendements "propriété" —
 * Gross/Net Property/Yield on Cost — en dépendent), donc la bissection
 * portait sur une fonction constante et renvoyait un résultat sans
 * signification. Sans faire varier collecteMontant avec le prix, ce
 * levier ne peut mathématiquement rien solveur.
 */
export function solveMaxAcquisitionPrice(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const basePrice = base.sourcesUses.prixNetVendeur;
  const baseCollecte = base.sourcesUses.collecteMontant;
  const yieldAt = (price: number) =>
    computeReturnsEngine({
      ...base,
      sourcesUses: { ...base.sourcesUses, prixNetVendeur: price, collecteMontant: Math.max(0, baseCollecte + (price - basePrice)) },
    }).securedNetYieldPct;
  return bisect(basePrice * 0.1, basePrice * 3, targetHurdlePct, yieldAt, true);
}

/** Loyer total minimum (mise à l'échelle uniforme de tous les baux) compatible avec le hurdle, prix fixé. */
export function solveMinSecuredRent(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const baseTotalLoyer = base.leases.reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);
  const yieldAtFactor = (factor: number) =>
    computeReturnsEngine({ ...base, leases: base.leases.map((l) => ({ ...l, loyerFacialAnnuel: l.loyerFacialAnnuel * factor })) }).securedNetYieldPct;

  const result = bisect(0.1, 3, targetHurdlePct, yieldAtFactor, false);
  return { value: result.value === null ? null : result.value * baseTotalLoyer, achievedYieldPct: result.achievedYieldPct, iterations: result.iterations };
}

/** Vacance & impayés maximum compatible avec le hurdle — tout le reste fixe. Borne haute 90% (au-delà, la notion même de vacance perd son sens économique). */
export function solveMaxVacancyCreditLossPct(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const yieldAt = (vacancyPct: number) => computeReturnsEngine({ ...base, vacancyCreditLossPct: vacancyPct }).securedNetYieldPct;
  return bisect(0, 90, targetHurdlePct, yieldAt, true);
}

/**
 * Budget CAPEX supplémentaire maximum (non planifié, ajouté à l'année 1 de
 * détention en plus du CAPEX déjà saisi) compatible avec le hurdle — répond
 * à "quel budget travaux reste compatible ?" (spec §19) sans supposer de
 * répartition dans le temps, cohérent avec le fait que ce CAPEX n'est par
 * définition pas encore planifié par année.
 */
export function solveMaxAdditionalCapex(base: ReturnsEngineInput, targetHurdlePct: number): ReverseSolverResult {
  const existingYear1Capex = base.capexByYear?.[1] ?? 0;
  const yieldAt = (additionalCapex: number) =>
    computeReturnsEngine({ ...base, capexByYear: { ...base.capexByYear, 1: existingYear1Capex + additionalCapex } }).securedNetYieldPct;
  const upperBound = Math.max(base.sourcesUses.prixNetVendeur, 1_000_000);
  return bisect(0, upperBound, targetHurdlePct, yieldAt, true);
}

export interface LeaseToSecure {
  leaseId: string;
  tenantName: string;
  weightPct: number;
}

export interface LeaseSecuringSolverResult {
  /**
   * Baux non sécurisés (SECURE_BEFORE_ACQUISITION ou EXCLUDE_FROM_SECURED_YIELD)
   * dont la sécurisation ramène le Secured Net Yield au-dessus du hurdle,
   * triés par poids décroissant (les plus impactants en premier) — liste
   * vide si le hurdle est déjà atteint, null si sécuriser tous les baux
   * disponibles ne suffit pas.
   */
  leasesToSecure: LeaseToSecure[] | null;
  achievedYieldPct: number;
}

/**
 * "Baux à sécuriser" (spec §19) — pas une bissection numérique comme les
 * autres leviers : simule, bail par bail (par poids décroissant), le
 * passage à un renouvellement signé (statutRenouvellement 'SIGNE') et
 * s'arrête dès que le Secured Net Yield franchit le hurdle. Un bail dont
 * l'échéance est déjà dépassée ne devient pas sécurisé par ce seul
 * changement (lease-security.util.ts l'exclut aussi sur la date) — la
 * simulation reste fidèle au moteur réel, jamais un résultat fabriqué.
 */
export function solveLeasesToSecure(base: ReturnsEngineInput, targetHurdlePct: number): LeaseSecuringSolverResult {
  const baseResult = computeReturnsEngine(base);
  if (baseResult.securedNetYieldPct >= targetHurdlePct) {
    return { leasesToSecure: [], achievedYieldPct: baseResult.securedNetYieldPct };
  }

  const candidates = baseResult.leaseSecurity.assessments
    .filter((a) => a.securityStatus === 'SECURE_BEFORE_ACQUISITION' || a.securityStatus === 'EXCLUDE_FROM_SECURED_YIELD')
    .sort((a, b) => b.weightPct - a.weightPct);

  const securedIds = new Set<string>();
  let achievedYieldPct = baseResult.securedNetYieldPct;
  for (const candidate of candidates) {
    securedIds.add(candidate.leaseId);
    const testLeases = base.leases.map((l) => (securedIds.has(l.id) ? { ...l, statutRenouvellement: 'SIGNE' as const } : l));
    achievedYieldPct = computeReturnsEngine({ ...base, leases: testLeases }).securedNetYieldPct;
    if (achievedYieldPct >= targetHurdlePct) {
      return {
        leasesToSecure: candidates.filter((c) => securedIds.has(c.leaseId)).map((c) => ({ leaseId: c.leaseId, tenantName: c.tenantName, weightPct: c.weightPct })),
        achievedYieldPct,
      };
    }
  }
  return { leasesToSecure: null, achievedYieldPct };
}
