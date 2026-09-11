import type { FractionalIndexationType } from '@prisma/client';
import { computeOperatingModelYear } from './operating-model.util';
import {
  computeStakeholderWaterfall,
  type YearContext,
  type StakeholderInput,
  type FeeDefinitionInput,
  type WaterfallTierInput,
  type StakeholderWaterfallInput,
  type StakeholderWaterfallResult,
} from './stakeholder-waterfall.util';
import {
  ALL_STRESS_SCENARIOS,
  RENT_DOWNSIDE_HAIRCUT_PCT,
  VACANCY_ADD_PCT,
  CAPEX_OVERRUN_MULTIPLIER,
  OPEX_ADD_PCT,
  EXIT_YIELD_EXPANSION_HAIRCUT_PCT,
  VALUE_DECLINE_HAIRCUT_PCT,
  PLATFORM_FEES_STRESS_MULTIPLIER,
  excludeLargestLeaseAmount,
  scaleLeaseRentsAmount,
  scaleCapexByYear,
  type StressScenarioKey,
} from './stress-testing.util';
import { projectIndexedGpr, type IndexGrowthRates } from './rent-indexation.util';

/**
 * Applique les 10 scénarios de stress-testing.util.ts au moteur
 * multi-stakeholder (Deal Economics, spec §29.9 "Stress tests des parties
 * prenantes") — sans ce module, un dossier utilisant la waterfall
 * multi-tiers ne montrait jamais l'effet d'une vacance ou d'un défaut
 * locataire sur le TRI de chaque partie prenante, seulement sur le split
 * simple investisseur/plateforme (stress-testing.util.ts). Réutilise à la
 * fois les magnitudes de choc et les fonctions d'application des scénarios
 * (exclusion du bail le plus élevé, scaling des loyers/CAPEX — exportées de
 * stress-testing.util.ts) pour qu'un même scénario "VACANCY" ou
 * "TENANT_DEFAULT" signifie exactement la même chose des deux côtés, pas
 * seulement les mêmes constantes.
 */

export interface LeaseAmount {
  id: string;
  loyerFacialAnnuel: number;
  indexation: FractionalIndexationType;
  indexationCapPct: number | null;
  indexationFloorPct: number | null;
}

export interface DealEconomicsScenarioContext {
  asOfDate: Date;
  holdPeriodYears: number;
  vacancyCreditLossPct: number;
  opexPct: number;
  rentGrowthPctPerYear: number;
  /** Taux de croissance par indice (rent-indexation.util.ts) — absent = aucune série de marché disponible, tout retombe sur rentGrowthPctPerYear. */
  indexGrowthRates?: IndexGrowthRates;
  leases: LeaseAmount[];
  capexByYear: Record<number, number>;
  exitValueBase: number;
  sellingCostsPct: number;
  coutTotal: number;
  prixNetVendeur: number;
  collecteMontant: number;
  stakeholders: StakeholderInput[];
  feeDefinitions: FeeDefinitionInput[];
  tiers: WaterfallTierInput[];
  hurdlePct: number;
  hasPlatformProfile: boolean;
}

function scaleFeeDefinitions(feeDefinitions: FeeDefinitionInput[], factor: number): FeeDefinitionInput[] {
  return feeDefinitions.map((f) =>
    f.feeType === 'RUNNING' || f.feeType === 'TRANSACTION'
      ? { ...f, ratePct: f.ratePct !== null ? f.ratePct * factor : null, fixedAmount: f.fixedAmount !== null ? f.fixedAmount * factor : null }
      : f,
  );
}

export function buildScenarioWaterfallInput(context: DealEconomicsScenarioContext, scenario: StressScenarioKey): StakeholderWaterfallInput {
  let leases = context.leases;
  let vacancyCreditLossPct = context.vacancyCreditLossPct;
  let opexPct = context.opexPct;
  let rentGrowthPctPerYear = context.rentGrowthPctPerYear;
  let indexGrowthRates = context.indexGrowthRates ?? {};
  let capexByYear = context.capexByYear;
  let exitValue = context.exitValueBase;
  let feeDefinitions = context.feeDefinitions;

  switch (scenario) {
    case 'BASE':
      break;
    case 'RENT_DOWNSIDE':
      leases = scaleLeaseRentsAmount(leases, 1 - RENT_DOWNSIDE_HAIRCUT_PCT / 100);
      rentGrowthPctPerYear = 0;
      indexGrowthRates = {};
      break;
    case 'VACANCY':
      vacancyCreditLossPct += VACANCY_ADD_PCT;
      break;
    case 'TENANT_DEFAULT':
      leases = excludeLargestLeaseAmount(leases);
      break;
    case 'CAPEX_OVERRUN':
      capexByYear = scaleCapexByYear(capexByYear, CAPEX_OVERRUN_MULTIPLIER);
      break;
    case 'OPEX_INCREASE':
      opexPct += OPEX_ADD_PCT;
      break;
    case 'EXIT_YIELD_EXPANSION':
      exitValue *= 1 - EXIT_YIELD_EXPANSION_HAIRCUT_PCT / 100;
      break;
    case 'VALUE_DECLINE':
      exitValue *= 1 - VALUE_DECLINE_HAIRCUT_PCT / 100;
      break;
    case 'PLATFORM_FEES_INCREASE':
      feeDefinitions = scaleFeeDefinitions(feeDefinitions, PLATFORM_FEES_STRESS_MULTIPLIER);
      break;
    case 'COMBINED_SEVERE':
      vacancyCreditLossPct += VACANCY_ADD_PCT;
      leases = excludeLargestLeaseAmount(leases);
      capexByYear = scaleCapexByYear(capexByYear, CAPEX_OVERRUN_MULTIPLIER);
      exitValue *= 1 - EXIT_YIELD_EXPANSION_HAIRCUT_PCT / 100;
      break;
  }

  const years: YearContext[] = [];
  for (let year = 1; year <= context.holdPeriodYears; year++) {
    const gpr = projectIndexedGpr(leases, indexGrowthRates, rentGrowthPctPerYear, year);
    const yearResult = computeOperatingModelYear({
      year,
      grossPotentialRent: gpr,
      vacancyCreditLossPct,
      opexPct,
      capexThisYear: capexByYear[year] ?? 0,
      annualManagementFeePct: 0,
      managementFeeBase: 0,
      incomeShareInvestorPct: 100,
    });
    years.push({
      year,
      prixNetVendeur: context.prixNetVendeur,
      coutTotal: context.coutTotal,
      assetValue: exitValue,
      grossPotentialRent: yearResult.grossPotentialRent,
      noi: yearResult.noi,
      capitalCollecte: context.collecteMontant,
      propertyLevelCashFlow: yearResult.distributableCashFlow,
    });
  }

  const netSaleProceeds = exitValue * (1 - context.sellingCostsPct / 100);
  const plusValue = Math.max(0, netSaleProceeds - context.coutTotal);

  return { asOfDate: context.asOfDate, stakeholders: context.stakeholders, feeDefinitions, tiers: context.tiers, years, netSaleProceeds, plusValue };
}

export interface DealEconomicsScenarioResult {
  scenario: StressScenarioKey;
  result: StakeholderWaterfallResult;
}

export function computeAllDealEconomicsStressScenarios(context: DealEconomicsScenarioContext): DealEconomicsScenarioResult[] {
  return ALL_STRESS_SCENARIOS.map((scenario) => ({ scenario, result: computeStakeholderWaterfall(buildScenarioWaterfallInput(context, scenario)) }));
}
