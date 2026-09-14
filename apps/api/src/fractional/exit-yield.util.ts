/**
 * Exit Yield Engine (spec V3.1 §11.1). Atlas ne prend jamais la valeur de
 * sortie saisie comme une donnée brute sans dire à quel taux de
 * capitalisation elle correspond. Ce moteur montre, pour Entry/Market/Base
 * Exit/Bear Exit/Severe Exit, le yield associé et l'impact € et % vs
 * acquisition qu'implique chaque scénario — jamais un chiffre composite.
 *
 * Réutilise le Cap Rate Build-Up (Complément H, H.3, cap-rate-build-up.util.ts)
 * pour Entry Yield (yield implicite réellement payé, entry.impliedCapRatePct)
 * et Base Exit Yield (build-up Atlas à la sortie, exit.buildUp.capRatePct —
 * une hypothèse prospective, pas un chiffre dérivé de la valeur de sortie
 * saisie par l'utilisateur). Bear/Severe appliquent une expansion de taux
 * explicite et nommée (jamais une constante cachée), à calibrer une fois
 * des dossiers réels disponibles — l'exemple donné par la spec (6,75 % →
 * 7,25 % → 8,00 %) correspond à +50 puis +75 points de base.
 */

export const BEAR_EXIT_YIELD_EXPANSION_BPS = 50;
/** Cumulé vs Base (pas vs Bear) — cohérent avec l'exemple spec §11.1 : 6,75 % (Base) -> 7,25 % (Bear, +50 pts) -> 8,00 % (Severe, +125 pts cumulés depuis Base). */
export const SEVERE_EXIT_YIELD_EXPANSION_BPS = 125;

export type ExitYieldScenario = 'BASE' | 'BEAR' | 'SEVERE';

export interface ExitYieldScenarioResult {
  scenario: ExitYieldScenario;
  exitYieldPct: number;
  /** NOI dernière année de détention / exitYieldPct — null si le yield stressé n'est plus positif (Unknown ≠ Zero, jamais une valeur fabriquée). */
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export interface ExitYieldEngineInput {
  entryYieldPct: number;
  /** null si aucun comparable VENTE avec yield renseigné n'existe pour la commune du projet — jamais un 0% inventé. */
  marketYieldPct: number | null;
  baseExitYieldPct: number;
  lastYearNoi: number;
  acquisitionValueEur: number;
}

export interface ExitYieldEngineResult {
  entryYieldPct: number;
  marketYieldPct: number | null;
  scenarios: ExitYieldScenarioResult[];
}

function computeScenario(scenario: ExitYieldScenario, exitYieldPct: number, noi: number, acquisitionValueEur: number): ExitYieldScenarioResult {
  if (exitYieldPct <= 0) {
    return { scenario, exitYieldPct, impliedExitValueEur: null, valueDeltaEur: null, valueDeltaPct: null };
  }
  const impliedExitValueEur = noi / (exitYieldPct / 100);
  const valueDeltaEur = impliedExitValueEur - acquisitionValueEur;
  const valueDeltaPct = acquisitionValueEur > 0 ? (valueDeltaEur / acquisitionValueEur) * 100 : 0;
  return { scenario, exitYieldPct, impliedExitValueEur, valueDeltaEur, valueDeltaPct };
}

export function computeExitYieldEngine(input: ExitYieldEngineInput): ExitYieldEngineResult {
  const bearExitYieldPct = input.baseExitYieldPct + BEAR_EXIT_YIELD_EXPANSION_BPS / 100;
  const severeExitYieldPct = input.baseExitYieldPct + SEVERE_EXIT_YIELD_EXPANSION_BPS / 100;

  return {
    entryYieldPct: input.entryYieldPct,
    marketYieldPct: input.marketYieldPct,
    scenarios: [
      computeScenario('BASE', input.baseExitYieldPct, input.lastYearNoi, input.acquisitionValueEur),
      computeScenario('BEAR', bearExitYieldPct, input.lastYearNoi, input.acquisitionValueEur),
      computeScenario('SEVERE', severeExitYieldPct, input.lastYearNoi, input.acquisitionValueEur),
    ],
  };
}

/**
 * Sensibilité minimale (spec §11.1) : mouvements de taux de capitalisation
 * en points de base ET variation du NOI — deux axes distincts, jamais
 * fusionnés en une seule matrice opaque.
 */
export const CAP_RATE_SENSITIVITY_STEPS_BPS = [-100, -50, 0, 50, 100, 150];
export const NOI_SENSITIVITY_STEPS_PCT = [-10, -5, 0, 5, 10];

export interface CapRateSensitivityPoint {
  deltaBps: number;
  exitYieldPct: number;
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export function computeCapRateSensitivity(baseExitYieldPct: number, lastYearNoi: number, acquisitionValueEur: number): CapRateSensitivityPoint[] {
  return CAP_RATE_SENSITIVITY_STEPS_BPS.map((deltaBps) => {
    const exitYieldPct = baseExitYieldPct + deltaBps / 100;
    const s = computeScenario('BASE', exitYieldPct, lastYearNoi, acquisitionValueEur);
    return { deltaBps, exitYieldPct, impliedExitValueEur: s.impliedExitValueEur, valueDeltaEur: s.valueDeltaEur, valueDeltaPct: s.valueDeltaPct };
  });
}

export interface NoiSensitivityPoint {
  noiDeltaPct: number;
  noiEur: number;
  impliedExitValueEur: number | null;
  valueDeltaEur: number | null;
  valueDeltaPct: number | null;
}

export function computeNoiSensitivity(baseExitYieldPct: number, lastYearNoi: number, acquisitionValueEur: number): NoiSensitivityPoint[] {
  return NOI_SENSITIVITY_STEPS_PCT.map((noiDeltaPct) => {
    const noiEur = lastYearNoi * (1 + noiDeltaPct / 100);
    const s = computeScenario('BASE', baseExitYieldPct, noiEur, acquisitionValueEur);
    return { noiDeltaPct, noiEur, impliedExitValueEur: s.impliedExitValueEur, valueDeltaEur: s.valueDeltaEur, valueDeltaPct: s.valueDeltaPct };
  });
}

/** Médiane simple — Market Yield est agrégé sur les comparables VENTE d'une commune, jamais une moyenne sensible aux valeurs extrêmes d'un pool encore petit. */
export function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
