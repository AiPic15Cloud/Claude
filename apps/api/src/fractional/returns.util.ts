import { computeXirr, type CashFlow } from '../deals/xirr.util';
import { computeSourcesUses, type SourcesUsesInput, type SourcesUsesResult } from './sources-uses.util';
import { computeLeaseSecurity, sumLoyerByStatuses, type LeaseInput, type LeaseSecurityResult } from './lease-security.util';
import { computeOperatingModelYear, computeTerminalProceeds, type OperatingModelYearResult, type TerminalProceedsResult } from './operating-model.util';
import { type IndexGrowthRates } from './rent-indexation.util';
import { projectPortfolioWithBreaks, type BreakScenario } from './break-event.util';
import { computeTvaCashflowEvents, type TvaRegime } from './tva-cashflow.util';

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
  /** Croissance annuelle de repli — utilisée pour tout bail en indexation "AUTRE" ou dont l'indice n'a pas de série de marché disponible. Les baux ILC/ILAT/IRL/ICC avec série connue utilisent indexGrowthRates à la place (§7 + patch V3.2 §2). */
  rentGrowthPctPerYear: number;
  /** Taux de croissance par indice, dérivé de RentIndexSeries (rent-indexation.util.ts) — absent = aucune série de marché disponible, tout retombe sur rentGrowthPctPerYear. */
  indexGrowthRates?: IndexGrowthRates;
  /** Décaissement CAPEX par année (1 = première année de détention). */
  capexByYear?: Record<number, number>;
  exitValue: number;
  sellingCostsPct: number;
  materialityThresholdPct?: number;
  /**
   * Branche du Break Event Engine (break-event.util.ts) appliquée à la
   * projection annuelle — BASE (défaut) laisse la trajectoire indexée
   * inchangée (locataire renouvelle), DOWNSIDE/SEVERE injectent vacance +
   * CAPEX de relocation + décote à la prochaine échéance de chaque bail.
   */
  breakScenario?: BreakScenario;
  /**
   * Régime de TVA (Complément H, H.3, tva-cashflow.util.ts) — absent ou
   * NON_ASSUJETTI : aucun décalage de trésorerie modélisé, TRI inchangé.
   * PRIX_TOTAL_OPTION_LOYERS injecte un décaissement à l'acquisition puis une
   * récupération au délai déclaratif dans le calendrier de flux de l'XIRR.
   */
  tva?: { regimeTva: TvaRegime; tauxPct: number | null; recuperationDelaiMois: number | null };
}

/**
 * Yield Dependency (spec §15) : décompose la performance investisseur totale
 * (distributions + revente, hors retour du capital investi) en trois
 * sources nommées — jamais un ratio composite opaque. rentContributionEur
 * prend l'année 1 comme référence "loyer plat" (sans indexation) projetée
 * sur tout l'horizon ; indexationContributionEur est le solde apporté par
 * la croissance des loyers (peut être négatif si le Break Event Engine
 * dégrade la trajectoire) ; resaleContributionEur est le seul gain de
 * capital part investisseur, hors retour du capital lui-même.
 */
export interface YieldDependencyBreakdown {
  rentContributionEur: number;
  indexationContributionEur: number;
  resaleContributionEur: number;
  totalPerformanceEur: number;
  /** null si totalPerformanceEur <= 0 — une part de "dépendance" n'a pas de sens sur une performance nulle ou négative (Unknown ≠ Zero). */
  rentSharePct: number | null;
  indexationSharePct: number | null;
  resaleSharePct: number | null;
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
  breakScenario: BreakScenario;
  /** Écart de TRI (points) imputable au seul décalage de trésorerie TVA — null si aucun régime PRIX_TOTAL_OPTION_LOYERS n'est modélisé. Négatif = le décalage dégrade le TRI. */
  irrImpactFromTvaTimingPts: number | null;

  /** Total Return (spec §15) = Income Return + Capital Return, cumulés sur tout l'horizon de détention (non annualisés — même convention que equityMultiple). */
  incomeReturnPct: number;
  capitalReturnPct: number;
  totalReturnPct: number;
  yieldDependency: YieldDependencyBreakdown;
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

  const indexGrowthRates = input.indexGrowthRates ?? {};
  const breakScenario = input.breakScenario ?? 'BASE';
  const yearlyModel: OperatingModelYearResult[] = [];
  for (let year = 1; year <= input.holdPeriodYears; year++) {
    const { grossPotentialRent: gpr, relettingCapex } = projectPortfolioWithBreaks(
      input.leases,
      indexGrowthRates,
      input.rentGrowthPctPerYear,
      input.asOfDate,
      year,
      breakScenario,
    );
    yearlyModel.push(
      computeOperatingModelYear({
        year,
        grossPotentialRent: gpr,
        vacancyCreditLossPct: input.vacancyCreditLossPct,
        opexPct: input.opexPct,
        capexThisYear: (input.capexByYear?.[year] ?? 0) + relettingCapex,
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
  const irrBeforeTva = computeXirr(cashFlows);

  const tvaEvents = input.tva
    ? computeTvaCashflowEvents({
        regimeTva: input.tva.regimeTva,
        prixNetVendeur: input.sourcesUses.prixNetVendeur,
        tvaTauxPct: input.tva.tauxPct,
        tvaRecuperationDelaiMois: input.tva.recuperationDelaiMois,
      })
    : [];
  for (const event of tvaEvents) {
    const date = new Date(input.asOfDate);
    date.setMonth(date.getMonth() + event.monthsFromAcquisition);
    cashFlows.push({ date, amount: event.amount });
  }
  const irr = tvaEvents.length > 0 ? computeXirr(cashFlows) : irrBeforeTva;
  const irrImpactFromTvaTimingPts = tvaEvents.length > 0 && irr !== null && irrBeforeTva !== null ? (irr - irrBeforeTva) * 100 : null;

  const cumulativeDistributions = yearlyModel.reduce((sum, y) => sum + y.investorDistribution, 0);
  const totalDistributions = cumulativeDistributions + terminalProceeds.investorTerminalProceeds;
  const equityMultiple = collecte > 0 ? totalDistributions / collecte : null;

  // Yield Dependency / Total Return (spec §15) — décomposition de la performance, jamais un ratio opaque.
  const returnOfCapital = Math.min(collecte, terminalProceeds.netSaleProceeds);
  const resaleContributionEur = terminalProceeds.investorTerminalProceeds - returnOfCapital;
  const rentContributionEur = year1 ? year1.investorDistribution * input.holdPeriodYears : 0;
  const indexationContributionEur = cumulativeDistributions - rentContributionEur;
  const totalPerformanceEur = rentContributionEur + indexationContributionEur + resaleContributionEur;
  const yieldDependency: YieldDependencyBreakdown = {
    rentContributionEur,
    indexationContributionEur,
    resaleContributionEur,
    totalPerformanceEur,
    rentSharePct: totalPerformanceEur > 0 ? (rentContributionEur / totalPerformanceEur) * 100 : null,
    indexationSharePct: totalPerformanceEur > 0 ? (indexationContributionEur / totalPerformanceEur) * 100 : null,
    resaleSharePct: totalPerformanceEur > 0 ? (resaleContributionEur / totalPerformanceEur) * 100 : null,
  };
  const incomeReturnPct = collecte > 0 ? (cumulativeDistributions / collecte) * 100 : 0;
  const capitalReturnPct = collecte > 0 ? (resaleContributionEur / collecte) * 100 : 0;

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
    breakScenario,
    irrImpactFromTvaTimingPts,
    incomeReturnPct,
    capitalReturnPct,
    totalReturnPct: incomeReturnPct + capitalReturnPct,
    yieldDependency,
  };
}
