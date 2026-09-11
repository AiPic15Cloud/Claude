import { computeReturnsEngine, type ReturnsEngineInput, type ReturnsEngineResult } from './returns.util';
import { computeEligibility, type EligibilityResult } from './eligibility.util';

/**
 * Stress Testing & Sensitivity Engine (spec V3 §18) — les 10 scénarios de la
 * spec, chacun une perturbation d'entrée appliquée à computeReturnsEngine
 * (boîte noire, pas de duplication de logique). Magnitudes de choc fixées
 * en constantes nommées — paramètres raisonnables par défaut, pas des
 * hypothèses calibrées sur un jeu de données réel ; à ajuster une fois des
 * dossiers réels disponibles pour recette.
 */

export type StressScenarioKey =
  | 'BASE'
  | 'RENT_DOWNSIDE'
  | 'VACANCY'
  | 'TENANT_DEFAULT'
  | 'CAPEX_OVERRUN'
  | 'OPEX_INCREASE'
  | 'EXIT_YIELD_EXPANSION'
  | 'VALUE_DECLINE'
  | 'PLATFORM_FEES_INCREASE'
  | 'COMBINED_SEVERE';

const RENT_DOWNSIDE_HAIRCUT_PCT = 10;
const VACANCY_ADD_PCT = 15;
const CAPEX_OVERRUN_MULTIPLIER = 1.5;
const OPEX_ADD_PCT = 5;
const EXIT_YIELD_EXPANSION_HAIRCUT_PCT = 10;
const VALUE_DECLINE_HAIRCUT_PCT = 20;
const PLATFORM_FEES_ADD_PCT = 2;

function excludeLargestLease(input: ReturnsEngineInput): ReturnsEngineInput {
  if (input.leases.length === 0) return input;
  const largest = [...input.leases].sort((a, b) => b.loyerFacialAnnuel - a.loyerFacialAnnuel)[0];
  return { ...input, leases: input.leases.filter((l) => l.id !== largest.id) };
}

function scaleLeaseRents(input: ReturnsEngineInput, factor: number): ReturnsEngineInput {
  return { ...input, leases: input.leases.map((l) => ({ ...l, loyerFacialAnnuel: l.loyerFacialAnnuel * factor })) };
}

function scaleCapex(input: ReturnsEngineInput, factor: number): ReturnsEngineInput {
  if (!input.capexByYear) return input;
  const scaled: Record<number, number> = {};
  for (const [year, amount] of Object.entries(input.capexByYear)) scaled[Number(year)] = amount * factor;
  return { ...input, capexByYear: scaled };
}

function applyScenario(base: ReturnsEngineInput, scenario: StressScenarioKey): ReturnsEngineInput {
  switch (scenario) {
    case 'BASE':
      return base;
    case 'RENT_DOWNSIDE':
      return { ...scaleLeaseRents(base, 1 - RENT_DOWNSIDE_HAIRCUT_PCT / 100), rentGrowthPctPerYear: 0 };
    case 'VACANCY':
      return { ...base, vacancyCreditLossPct: base.vacancyCreditLossPct + VACANCY_ADD_PCT };
    case 'TENANT_DEFAULT':
      return excludeLargestLease(base);
    case 'CAPEX_OVERRUN':
      return scaleCapex(base, CAPEX_OVERRUN_MULTIPLIER);
    case 'OPEX_INCREASE':
      return { ...base, opexPct: base.opexPct + OPEX_ADD_PCT };
    case 'EXIT_YIELD_EXPANSION':
      return { ...base, exitValue: base.exitValue * (1 - EXIT_YIELD_EXPANSION_HAIRCUT_PCT / 100) };
    case 'VALUE_DECLINE':
      return { ...base, exitValue: base.exitValue * (1 - VALUE_DECLINE_HAIRCUT_PCT / 100) };
    case 'PLATFORM_FEES_INCREASE':
      return { ...base, annualManagementFeePct: base.annualManagementFeePct + PLATFORM_FEES_ADD_PCT };
    case 'COMBINED_SEVERE': {
      const withVacancy = { ...base, vacancyCreditLossPct: base.vacancyCreditLossPct + VACANCY_ADD_PCT };
      const withDefault = excludeLargestLease(withVacancy);
      const withCapex = scaleCapex(withDefault, CAPEX_OVERRUN_MULTIPLIER);
      return { ...withCapex, exitValue: withCapex.exitValue * (1 - EXIT_YIELD_EXPANSION_HAIRCUT_PCT / 100) };
    }
  }
}

export interface StressScenarioResult {
  scenario: StressScenarioKey;
  noi: number;
  investorNetYieldPct: number;
  securedNetYieldPct: number;
  irrPct: number | null;
  equityMultiple: number | null;
  exitValue: number;
  /** Capital non récupéré si multiple < 1, sinon 0. */
  maxLoss: number;
  yearsUnderHurdle: number;
  eligibility: EligibilityResult;
}

export function computeStressScenario(base: ReturnsEngineInput, scenario: StressScenarioKey, hurdlePct: number): StressScenarioResult {
  const input = applyScenario(base, scenario);
  const result: ReturnsEngineResult = computeReturnsEngine(input);
  const collecte = input.sourcesUses.collecteMontant;

  const yearsUnderHurdle = result.yearlyModel.filter((y) => {
    const yearYieldPct = collecte > 0 ? (y.investorDistribution / collecte) * 100 : 0;
    return yearYieldPct < hurdlePct;
  }).length;

  const maxLoss = result.equityMultiple !== null && result.equityMultiple < 1 ? collecte * (1 - result.equityMultiple) : 0;

  return {
    scenario,
    noi: result.yearlyModel[0]?.noi ?? 0,
    investorNetYieldPct: result.investorNetYieldPct,
    securedNetYieldPct: result.securedNetYieldPct,
    irrPct: result.irrPct,
    equityMultiple: result.equityMultiple,
    exitValue: input.exitValue,
    maxLoss,
    yearsUnderHurdle,
    eligibility: computeEligibility(result.securedNetYieldPct, hurdlePct),
  };
}

export const ALL_STRESS_SCENARIOS: StressScenarioKey[] = [
  'BASE',
  'RENT_DOWNSIDE',
  'VACANCY',
  'TENANT_DEFAULT',
  'CAPEX_OVERRUN',
  'OPEX_INCREASE',
  'EXIT_YIELD_EXPANSION',
  'VALUE_DECLINE',
  'PLATFORM_FEES_INCREASE',
  'COMBINED_SEVERE',
];

export function computeAllStressScenarios(base: ReturnsEngineInput, hurdlePct: number): StressScenarioResult[] {
  return ALL_STRESS_SCENARIOS.map((scenario) => computeStressScenario(base, scenario, hurdlePct));
}
