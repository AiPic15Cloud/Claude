import { computeXirr, type CashFlow } from '../deals/xirr.util';
import { computeSourcesUses, type SourcesUsesInput, type SourcesUsesResult } from './sources-uses.util';
import { computeLeaseSecurity, sumLoyerByStatuses, type LeaseInput, type LeaseSecurityResult } from './lease-security.util';
import { computeOperatingModelYear, computeTerminalProceeds, type OperatingModelYearResult, type TerminalProceedsResult } from './operating-model.util';
import { type IndexGrowthRates } from './rent-indexation.util';
import { projectPortfolioWithBreaks, type BreakScenario } from './break-event.util';
import { computeTvaCashflowEvents, type TvaRegime } from './tva-cashflow.util';
import {
  computeAnnualCorporateTax,
  computeAnnualCfe,
  computeAnnualCrl,
  computeExitCapitalGainTax,
  computeResale1115Complement,
  type CorporateTaxRateSchedule,
  type Resale1115ComplementResult,
} from './tax-engine.util';

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
  /**
   * Fiscalité du véhicule (tax-engine.util.ts) — absente par défaut : tous
   * les champs ci-dessus (irrPct, equityMultiple, investorNetYieldPct...)
   * restent calculés avant impôt, comme avant l'introduction de ce moteur.
   * Quand fournie, les équivalents après impôt apparaissent dans
   * ReturnsEngineResult.tax, jamais en remplacement des champs existants.
   */
  tax?: FractionalTaxAssumptions;
}

export interface FractionalTaxAssumptions {
  /** Déficit reportable d'ouverture (normalement 0 à l'acquisition d'un véhicule neuf). */
  openingCarryforwardDeficit?: number;
  schedule?: CorporateTaxRateSchedule;
  capitalGainTaxRatePct?: number;
  /** CFE pleine estimée par an (grille indicative par tranche de loyer) — jamais recalculée ici, fournie par l'appelant. */
  annualCfeFullBase?: number;
  /** CRL (spec référentiel : immeuble achevé depuis plus de 15 ans) — absente/false = non applicable, jamais présumée. */
  crlApplicable?: boolean;
  crlRatePct?: number;
  /** Complément de droits art. 1115 CGI si la sortie dépasse l'engagement de revente (régime marchand de biens). */
  resale1115?: { dutyBase: number; resaleCommitmentMonths?: number; lateInterestPctPerMonth?: number };
}

export interface FractionalTaxYearResult {
  year: number;
  cfeDue: number;
  crlDue: number;
  taxableProfitBeforeCarryforward: number;
  taxableProfitAfterCarryforward: number;
  corporateTaxDue: number;
  carryforwardDeficitEnd: number;
  distributableCashFlowAfterTax: number;
  investorDistributionAfterTax: number;
}

export interface FractionalExitTaxResult {
  capitalGain: number;
  taxableCapitalGainAfterCarryforward: number;
  capitalGainTaxDue: number;
  resale1115: Resale1115ComplementResult | null;
  investorTerminalProceedsAfterTax: number;
}

export interface FractionalTaxComputationResult {
  yearly: FractionalTaxYearResult[];
  exit: FractionalExitTaxResult;
  finalCarryforwardDeficit: number;
  /** IS annuel + CFE + CRL cumulés sur l'horizon + IS plus-value + complément 1115. */
  totalTaxBurden: number;
  irrPctAfterTax: number | null;
  equityMultipleAfterTax: number | null;
  investorNetYieldPctAfterTax: number | null;
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

  /** null quand le dénominateur requis (prix, collecte, coût...) est absent ou nul — jamais confondu avec un rendement réellement nul (doctrine "Unknown ≠ Zero"). */
  grossYieldPct: number | null;
  grossYieldAiPct: number | null;
  netPropertyYieldPct: number | null;
  investorNetYieldPct: number | null;
  securedNetYieldPct: number | null;
  yieldOnCostPct: number | null;

  irrPct: number | null;
  equityMultiple: number | null;
  breakScenario: BreakScenario;
  /** Écart de TRI (points) imputable au seul décalage de trésorerie TVA — null si aucun régime PRIX_TOTAL_OPTION_LOYERS n'est modélisé. Négatif = le décalage dégrade le TRI. */
  irrImpactFromTvaTimingPts: number | null;

  /** Total Return (spec §15) = Income Return + Capital Return, cumulés sur tout l'horizon de détention (non annualisés — même convention que equityMultiple). */
  incomeReturnPct: number | null;
  capitalReturnPct: number | null;
  totalReturnPct: number | null;
  yieldDependency: YieldDependencyBreakdown;
  /** null quand input.tax n'est pas fourni — aucune hypothèse fiscale silencieuse (Unknown ≠ Zero). */
  tax: FractionalTaxComputationResult | null;
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
  const grossYieldPct = input.sourcesUses.prixNetVendeur > 0 ? (leaseSecurity.totalLoyerFacial / input.sourcesUses.prixNetVendeur) * 100 : null;
  const grossYieldAiPct = sourcesUsesResult.coutActeEnMain > 0 ? (leaseSecurity.totalLoyerFacial / sourcesUsesResult.coutActeEnMain) * 100 : null;
  const netPropertyYieldPct = sourcesUsesResult.coutActeEnMain > 0 && year1 ? (year1.noi / sourcesUsesResult.coutActeEnMain) * 100 : null;
  const investorNetYieldPct = collecte > 0 && year1 ? (year1.investorDistribution / collecte) * 100 : null;
  const securedNetYieldPct = collecte > 0 ? (securedYear1.investorDistribution / collecte) * 100 : null;
  const yieldOnCostPct = sourcesUsesResult.coutTotal > 0 && year1 ? (year1.noi / sourcesUsesResult.coutTotal) * 100 : null;

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
  const incomeReturnPct = collecte > 0 ? (cumulativeDistributions / collecte) * 100 : null;
  const capitalReturnPct = collecte > 0 ? (resaleContributionEur / collecte) * 100 : null;

  // Fiscalité du véhicule (tax-engine.util.ts) — opt-in, cf. commentaire sur
  // ReturnsEngineInput.tax. Le CAPEX n'est jamais déduit du résultat
  // imposable (coût du stock = closing + capex capitalisés, même convention
  // que le fichier LPB de référence) : seuls NOI, coûts plateforme, CFE et
  // CRL alimentent taxableProfitBeforeCarryforward.
  let tax: FractionalTaxComputationResult | null = null;
  if (input.tax) {
    const taxAssumptions = input.tax;
    let carryforwardDeficit = taxAssumptions.openingCarryforwardDeficit ?? 0;
    const yearlyTax: FractionalTaxYearResult[] = [];
    for (const y of yearlyModel) {
      const isExitYear = y.year === input.holdPeriodYears;
      const cfeDue = taxAssumptions.annualCfeFullBase
        ? computeAnnualCfe({ holdingYear: y.year, isExitYear, annualCfeFullBase: taxAssumptions.annualCfeFullBase })
        : 0;
      // Approximation documentée : à défaut d'une ventilation TVA par bail
      // dans ce moteur, l'assiette CRL retenue est l'EGI de l'année — à
      // affiner si des baux assujettis à la TVA coexistent avec des baux qui
      // ne le sont pas dans le même dossier.
      const crlDue = taxAssumptions.crlApplicable
        ? computeAnnualCrl({ rentsNotSubjectToVat: y.effectiveGrossIncome, applicable: true, ratePct: taxAssumptions.crlRatePct })
        : 0;
      const taxableProfitBeforeCarryforward = y.noi - y.platformVehicleCosts - cfeDue - crlDue;
      const { taxableProfitAfterCarryforward, corporateTaxDue, carryforwardDeficitEnd } = computeAnnualCorporateTax({
        taxableProfitBeforeCarryforward,
        carryforwardDeficitStart: carryforwardDeficit,
        schedule: taxAssumptions.schedule,
      });
      carryforwardDeficit = carryforwardDeficitEnd;
      const distributableCashFlowAfterTax = y.distributableCashFlow - cfeDue - crlDue - corporateTaxDue;
      yearlyTax.push({
        year: y.year,
        cfeDue,
        crlDue,
        taxableProfitBeforeCarryforward,
        taxableProfitAfterCarryforward,
        corporateTaxDue,
        carryforwardDeficitEnd,
        distributableCashFlowAfterTax,
        investorDistributionAfterTax: distributableCashFlowAfterTax * (input.incomeShareInvestorPct / 100),
      });
    }

    const resale1115 = taxAssumptions.resale1115
      ? computeResale1115Complement({
          holdingMonthsAtExit: input.holdPeriodYears * 12,
          resaleCommitmentMonths: taxAssumptions.resale1115.resaleCommitmentMonths,
          dutyBase: taxAssumptions.resale1115.dutyBase,
          lateInterestPctPerMonth: taxAssumptions.resale1115.lateInterestPctPerMonth,
        })
      : null;
    const { taxableCapitalGainAfterCarryforward, capitalGainTaxDue } = computeExitCapitalGainTax({
      capitalGain: terminalProceeds.capitalGain,
      remainingCarryforwardDeficit: carryforwardDeficit,
      capitalGainTaxRatePct: taxAssumptions.capitalGainTaxRatePct,
    });
    // L'IS sur plus-value et le complément de droits 1115 sont des charges
    // du véhicule prélevées sur le produit net avant tout partage, exactement
    // comme computeTerminalProceeds traite déjà sellingCostsPct — jamais une
    // simple ponction a posteriori sur la part investisseur.
    const netSaleProceedsAfterTax = terminalProceeds.netSaleProceeds - capitalGainTaxDue - (resale1115?.totalDue ?? 0);
    const capitalGainAfterTax = Math.max(0, netSaleProceedsAfterTax - collecte);
    const investorTerminalProceedsAfterTax = Math.min(collecte, netSaleProceedsAfterTax) + capitalGainAfterTax * (input.capitalGainShareInvestorPct / 100);

    const totalTaxBurden =
      yearlyTax.reduce((sum, y) => sum + y.cfeDue + y.crlDue + y.corporateTaxDue, 0) + capitalGainTaxDue + (resale1115?.totalDue ?? 0);

    const cashFlowsAfterTax: CashFlow[] = [{ date: input.asOfDate, amount: -collecte }];
    yearlyTax.forEach((y, idx) => {
      const date = new Date(input.asOfDate);
      date.setFullYear(date.getFullYear() + y.year);
      const isLast = idx === yearlyTax.length - 1;
      cashFlowsAfterTax.push({ date, amount: y.investorDistributionAfterTax + (isLast ? investorTerminalProceedsAfterTax : 0) });
    });
    const irrAfterTax = computeXirr(cashFlowsAfterTax);
    const cumulativeDistributionsAfterTax = yearlyTax.reduce((sum, y) => sum + y.investorDistributionAfterTax, 0);

    tax = {
      yearly: yearlyTax,
      exit: {
        capitalGain: terminalProceeds.capitalGain,
        taxableCapitalGainAfterCarryforward,
        capitalGainTaxDue,
        resale1115,
        investorTerminalProceedsAfterTax,
      },
      finalCarryforwardDeficit: carryforwardDeficit,
      totalTaxBurden,
      irrPctAfterTax: irrAfterTax === null ? null : irrAfterTax * 100,
      equityMultipleAfterTax: collecte > 0 ? (cumulativeDistributionsAfterTax + investorTerminalProceedsAfterTax) / collecte : null,
      investorNetYieldPctAfterTax: collecte > 0 && yearlyTax[0] ? (yearlyTax[0].investorDistributionAfterTax / collecte) * 100 : null,
    };
  }

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
    totalReturnPct: incomeReturnPct !== null && capitalReturnPct !== null ? incomeReturnPct + capitalReturnPct : null,
    yieldDependency,
    tax,
  };
}
