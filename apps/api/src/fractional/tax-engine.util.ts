/**
 * Tax Engine — fiscalité du véhicule (SPV en SAS à l'IS, régime marchand de
 * biens). Comble un vide documenté dans operating-model.util.ts
 * ("pas de fiscalité modélisée... différé") et terminal-proceeds (même
 * fichier) : le Secured Net Yield / TRI affichés ailleurs dans Atlas sont
 * aujourd'hui calculés avant impôt. Barèmes repris tels quels d'un
 * référentiel d'audit locatif LPB (taux IS, seuil PME, CRL, CFE, engagement
 * de revente art. 1115) — pas inventés, à recalibrer si le barème change.
 *
 * Pure functions uniquement, même doctrine que le reste de fractional/* :
 * le report de déficit (carryforwardDeficit) est un état explicite que
 * l'appelant fait transiter année par année — ce fichier ne mémorise rien.
 */

export interface CorporateTaxRateSchedule {
  /** IS — taux réduit PME (%), appliqué jusqu'à reducedRateCeiling de bénéfice. */
  reducedRatePct: number;
  /** IS — plafond du bénéfice auquel s'applique le taux réduit (€). */
  reducedRateCeiling: number;
  /** IS — taux normal (%), appliqué au-delà du plafond. */
  normalRatePct: number;
}

/** Barème IS PME au 30/09/2026 (référentiel d'audit locatif LPB §D). */
export const DEFAULT_CORPORATE_TAX_SCHEDULE: CorporateTaxRateSchedule = {
  reducedRatePct: 15,
  reducedRateCeiling: 42500,
  normalRatePct: 25,
};

/** IS sur la plus-value de cession (régime marchand de biens : taux normal, pas de taux réduit). */
export const DEFAULT_CAPITAL_GAIN_TAX_RATE_PCT = 25;

export interface AnnualCorporateTaxInput {
  /** Résultat imposable de l'exercice avant imputation du report déficitaire — peut être négatif. */
  taxableProfitBeforeCarryforward: number;
  /** Déficit cumulé reporté des exercices précédents (toujours >= 0). */
  carryforwardDeficitStart: number;
  schedule?: CorporateTaxRateSchedule;
}

export interface AnnualCorporateTaxResult {
  /** Résultat imposable après imputation du report — toujours >= 0. */
  taxableProfitAfterCarryforward: number;
  corporateTaxDue: number;
  /** Déficit restant à reporter sur les exercices suivants (toujours >= 0). */
  carryforwardDeficitEnd: number;
}

/**
 * IS annuel avec report des déficits (spec LPB : "déficits reportables
 * imputés sur l'exploitation puis, à la sortie, sur la plus-value de
 * cession"). Un exercice déficitaire ne paie rien et grossit le report —
 * jamais une IS négative (pas de remboursement anticipé modélisé).
 */
export function computeAnnualCorporateTax(input: AnnualCorporateTaxInput): AnnualCorporateTaxResult {
  const schedule = input.schedule ?? DEFAULT_CORPORATE_TAX_SCHEDULE;

  if (input.taxableProfitBeforeCarryforward <= 0) {
    return {
      taxableProfitAfterCarryforward: 0,
      corporateTaxDue: 0,
      carryforwardDeficitEnd: input.carryforwardDeficitStart + Math.abs(input.taxableProfitBeforeCarryforward),
    };
  }

  const imputed = Math.min(input.carryforwardDeficitStart, input.taxableProfitBeforeCarryforward);
  const taxableProfitAfterCarryforward = input.taxableProfitBeforeCarryforward - imputed;
  const carryforwardDeficitEnd = input.carryforwardDeficitStart - imputed;

  const reducedBase = Math.min(taxableProfitAfterCarryforward, schedule.reducedRateCeiling);
  const normalBase = Math.max(0, taxableProfitAfterCarryforward - schedule.reducedRateCeiling);
  const corporateTaxDue = reducedBase * (schedule.reducedRatePct / 100) + normalBase * (schedule.normalRatePct / 100);

  return { taxableProfitAfterCarryforward, corporateTaxDue, carryforwardDeficitEnd };
}

export interface ExitCapitalGainTaxInput {
  /** Plus-value brute à la sortie (prix net vendeur − coût du stock) — jamais négative, clampée par l'appelant. */
  capitalGain: number;
  /** Déficit cumulé restant après imputation sur l'exploitation de tous les exercices précédents. */
  remainingCarryforwardDeficit: number;
  capitalGainTaxRatePct?: number;
}

export interface ExitCapitalGainTaxResult {
  taxableCapitalGainAfterCarryforward: number;
  capitalGainTaxDue: number;
}

/** IS sur la plus-value de cession, après imputation du solde de déficit reportable restant. */
export function computeExitCapitalGainTax(input: ExitCapitalGainTaxInput): ExitCapitalGainTaxResult {
  const rate = input.capitalGainTaxRatePct ?? DEFAULT_CAPITAL_GAIN_TAX_RATE_PCT;
  const capitalGain = Math.max(0, input.capitalGain);
  const imputed = Math.min(Math.max(0, input.remainingCarryforwardDeficit), capitalGain);
  const taxableCapitalGainAfterCarryforward = capitalGain - imputed;

  return {
    taxableCapitalGainAfterCarryforward,
    capitalGainTaxDue: taxableCapitalGainAfterCarryforward * (rate / 100),
  };
}

/** CFE — coefficients par année de détention (référentiel LPB §D) : le véhicule n'existait pas au 1er janvier de sa création. */
export const CFE_COEFFICIENTS = {
  creationYear: 0,
  secondYear: 0.5,
  subsequentYears: 1,
};

/** Coefficient CFE applicable à une année de détention donnée, hors année de sortie (due en entier quel que soit le coefficient normal). */
export function resolveCfeCoefficient(holdingYear: number): number {
  if (holdingYear <= 1) return CFE_COEFFICIENTS.creationYear;
  if (holdingYear === 2) return CFE_COEFFICIENTS.secondYear;
  return CFE_COEFFICIENTS.subsequentYears;
}

export interface AnnualCfeInput {
  holdingYear: number;
  /** L'année civile de sortie doit la CFE en entier, quel que soit le coefficient normal de l'année. */
  isExitYear: boolean;
  /** Base CFE pleine estimée (grille indicative par tranche de loyer — fournie par l'appelant, jamais recalculée ici). */
  annualCfeFullBase: number;
}

export function computeAnnualCfe(input: AnnualCfeInput): number {
  if (input.isExitYear) return input.annualCfeFullBase;
  return input.annualCfeFullBase * resolveCfeCoefficient(input.holdingYear);
}

/** CRL (Contribution sur les Revenus Locatifs) — référentiel LPB §D : due si l'immeuble a plus de ce nombre d'années. */
export const CRL_BUILDING_AGE_THRESHOLD_YEARS = 15;
export const CRL_DEFAULT_RATE_PCT = 2.5;

/**
 * La CRL ne frappe que les loyers non soumis à TVA d'un immeuble achevé
 * depuis plus de CRL_BUILDING_AGE_THRESHOLD_YEARS ans. Âge inconnu => non
 * applicable explicitement signalé par l'appelant (jamais présumé
 * applicable ni non-applicable faute de donnée — doctrine "Unknown ≠
 * Zero" : à l'appelant de distinguer "non applicable" de "non renseigné").
 */
export function isCrlApplicable(buildingAgeYearsAtAcquisition: number): boolean {
  return buildingAgeYearsAtAcquisition > CRL_BUILDING_AGE_THRESHOLD_YEARS;
}

export interface AnnualCrlInput {
  rentsNotSubjectToVat: number;
  applicable: boolean;
  ratePct?: number;
}

export function computeAnnualCrl(input: AnnualCrlInput): number {
  if (!input.applicable) return 0;
  return input.rentsNotSubjectToVat * ((input.ratePct ?? CRL_DEFAULT_RATE_PCT) / 100);
}

/** Droits de mutation — barème notarial (référentiel LPB §C, Légifrance A.444-91 / CGI 1594D / 1115). */
export const REDUCED_TRANSFER_DUTY_PCT = 0.71498;
export const FULL_TRANSFER_DUTY_PCT = 5.80665;

/** Engagement de revente art. 1115 CGI (référentiel LPB §D) — au-delà, le différentiel de droits devient exigible. */
export const RESALE_COMMITMENT_MONTHS_DEFAULT = 60;
/** Intérêt de retard sur complément de droits (% par mois de dépassement, référentiel LPB §D). */
export const LATE_INTEREST_PCT_PER_MONTH_DEFAULT = 0.2;

export interface Resale1115ComplementInput {
  /** Durée de détention effective au jour de la cession (mois). */
  holdingMonthsAtExit: number;
  resaleCommitmentMonths?: number;
  /** Assiette des droits — prix net vendeur, hors commission à la charge de l'acquéreur. */
  dutyBase: number;
  lateInterestPctPerMonth?: number;
}

export interface Resale1115ComplementResult {
  commitmentBreached: boolean;
  /** Différentiel (droits pleins − droits réduits) sur l'assiette, dû seulement si l'engagement est dépassé. */
  dutyComplementDue: number;
  lateInterestDue: number;
  totalDue: number;
}

/**
 * Complément de droits de mutation si la sortie dépasse l'engagement de
 * revente art. 1115 CGI (régime marchand de biens) : la réduction de droits
 * accordée à l'acquisition doit être régularisée au taux plein, majorée
 * d'un intérêt de retard par mois de dépassement.
 */
export function computeResale1115Complement(input: Resale1115ComplementInput): Resale1115ComplementResult {
  const commitmentMonths = input.resaleCommitmentMonths ?? RESALE_COMMITMENT_MONTHS_DEFAULT;
  const breached = input.holdingMonthsAtExit > commitmentMonths;

  if (!breached) {
    return { commitmentBreached: false, dutyComplementDue: 0, lateInterestDue: 0, totalDue: 0 };
  }

  const dutyComplementPct = (FULL_TRANSFER_DUTY_PCT - REDUCED_TRANSFER_DUTY_PCT) / 100;
  const dutyComplementDue = input.dutyBase * dutyComplementPct;
  const overageMonths = input.holdingMonthsAtExit - commitmentMonths;
  const lateInterestDue = dutyComplementDue * ((input.lateInterestPctPerMonth ?? LATE_INTEREST_PCT_PER_MONTH_DEFAULT) / 100) * overageMonths;

  return { commitmentBreached: true, dutyComplementDue, lateInterestDue, totalDue: dutyComplementDue + lateInterestDue };
}
