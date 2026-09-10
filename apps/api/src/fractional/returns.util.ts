import { computeXirr, type CashFlow } from '../deals/xirr.util';
import { computeSourcesUses, type SourcesUsesInput, type SourcesUsesResult } from './sources-uses.util';
import { computeLeaseSecurity, sumLoyerByStatuses, type LeaseInput, type LeaseSecurityResult } from './lease-security.util';
import { computeOperatingModelYear, computeTerminalProceeds, type OperatingModelYearResult, type TerminalProceedsResult } from './operating-model.util';

/**
 * Returns Engine (spec V3 §15) — orchestre Sources/Uses, Lease Security et
 * Operating Model pour produire les rendements de la fiche Synthèse.
 *
 * Secured Net Yield recalcule le NOI en ne comptant que les loyers des baux
 * SECURED/WATCH (spec §7.1 "Secured NOI calculé sur revenus jugés
 * suffisamment sécurisés") ; Stressed Net Yield n'est PAS calculé ici —
 * l'appelant invoque `computeReturnsEngine` une seconde fois avec un jeu
 * d'hypothèses Bear/Severe (AssumptionSet) et prend `investorNetYieldPct` du
 * second appel, pour ne pas dupliquer la logique de stress dans ce moteur.
 */

export interface ReturnsEngineInput {
  asOfDate: Date;
  sourcesUses: SourcesUsesInput;
  leases: LeaseInput[];
  holdPeriodYears: number;
  vacancyCreditLossPct: number;
  opexPct: number;
  annualManagementFeePct: number;
  incomeShareInvestorPct: number;
  capitalGainShareInvestorPct: number;
  /** Croissance annuelle uniforme des loyers — simplification P0 d'une indexation ILC/ILAT par bail (RentIndexSeries alimentera ce paramètre en P1). */
  rentGrowthPctPerYear: number;
  /** Décaissement CAPEX par année (1 = première année de détention). */
  capexByYear?: Record<number, number>;
  exitValue: number;
  sellingCostsPct: number;
  materialityThresholdPct?: number;
}

export interface ReturnsEngineResult {
  sourcesUsesResult: SourcesUsesResult;
  leaseSecurity: LeaseSecurityResult;
  yearlyModel: OperatingModelYearResult[];
  terminalProceeds: TerminalProceedsResult;

  grossYieldPct: number;
  grossYieldAiPct: number;
  netPropertyYieldPct: number;
  investorNetYieldPct: number;
  securedNetYieldPct: number;
  yieldOnCostPct: number;

  irrPct: number | null;
  equityMultiple: number | null;
}

export function computeReturnsEngine(input: ReturnsEngineInput): ReturnsEngineResult {
  const sourcesUsesResult = computeSourcesUses(input.sourcesUses);
  const leaseSecurity = computeLeaseSecurity({
    leases: input.leases,
    asOfDate: input.asOfDate,
    holdPeriodMonths: input.holdPeriodYears * 12,
    materialityThresholdPct: input.materialityThresholdPct,
  });

  const collecte = input.sourcesUses.collecteMontant;
  const managementFeeBase = collecte;

  const yearlyModel: OperatingModelYearResult[] = [];
  for (let year = 1; year <= input.holdPeriodYears; year++) {
    const gpr = leaseSecurity.totalLoyerFacial * Math.pow(1 + input.rentGrowthPctPerYear / 100, year - 1);
    yearlyModel.push(
      computeOperatingModelYear({
        year,
        grossPotentialRent: gpr,
        vacancyCreditLossPct: input.vacancyCreditLossPct,
        opexPct: input.opexPct,
        capexThisYear: input.capexByYear?.[year] ?? 0,
        annualManagementFeePct: input.annualManagementFeePct,
        managementFeeBase,
        incomeShareInvestorPct: input.incomeShareInvestorPct,
      }),
    );
  }

  const terminalProceeds = computeTerminalProceeds({
    exitValue: input.exitValue,
    sellingCostsPct: input.sellingCostsPct,
    capitalInvested: collecte,
    capitalGainShareInvestorPct: input.capitalGainShareInvestorPct,
  });

  const securedLoyerFacial = sumLoyerByStatuses(input.leases, leaseSecurity.assessments, ['SECURED', 'WATCH']);
  const securedRatio = leaseSecurity.totalLoyerFacial > 0 ? securedLoyerFacial / leaseSecurity.totalLoyerFacial : 0;
  const securedYear1 = computeOperatingModelYear({
    year: 1,
    grossPotentialRent: leaseSecurity.totalLoyerFacial * securedRatio,
    vacancyCreditLossPct: input.vacancyCreditLossPct,
    opexPct: input.opexPct,
    capexThisYear: input.capexByYear?.[1] ?? 0,
    annualManagementFeePct: input.annualManagementFeePct,
    managementFeeBase,
    incomeShareInvestorPct: input.incomeShareInvestorPct,
  });

  const year1 = yearlyModel[0];
  const grossYieldPct = input.sourcesUses.prixNetVendeur > 0 ? (leaseSecurity.totalLoyerFacial / input.sourcesUses.prixNetVendeur) * 100 : 0;
  const grossYieldAiPct = sourcesUsesResult.coutActeEnMain > 0 ? (leaseSecurity.totalLoyerFacial / sourcesUsesResult.coutActeEnMain) * 100 : 0;
  const netPropertyYieldPct = sourcesUsesResult.coutActeEnMain > 0 && year1 ? (year1.noi / sourcesUsesResult.coutActeEnMain) * 100 : 0;
  const investorNetYieldPct = collecte > 0 && year1 ? (year1.investorDistribution / collecte) * 100 : 0;
  const securedNetYieldPct = collecte > 0 ? (securedYear1.investorDistribution / collecte) * 100 : 0;
  const yieldOnCostPct = sourcesUsesResult.coutTotal > 0 && year1 ? (year1.noi / sourcesUsesResult.coutTotal) * 100 : 0;

  const cashFlows: CashFlow[] = [{ date: input.asOfDate, amount: -collecte }];
  yearlyModel.forEach((y, idx) => {
    const date = new Date(input.asOfDate);
    date.setFullYear(date.getFullYear() + y.year);
    const isLast = idx === yearlyModel.length - 1;
    cashFlows.push({ date, amount: y.investorDistribution + (isLast ? terminalProceeds.investorTerminalProceeds : 0) });
  });
  const irr = computeXirr(cashFlows);
  const totalDistributions = yearlyModel.reduce((sum, y) => sum + y.investorDistribution, 0) + terminalProceeds.investorTerminalProceeds;
  const equityMultiple = collecte > 0 ? totalDistributions / collecte : null;

  return {
    sourcesUsesResult,
    leaseSecurity,
    yearlyModel,
    terminalProceeds,
    grossYieldPct,
    grossYieldAiPct,
    netPropertyYieldPct,
    investorNetYieldPct,
    securedNetYieldPct,
    yieldOnCostPct,
    irrPct: irr === null ? null : irr * 100,
    equityMultiple,
  };
}
