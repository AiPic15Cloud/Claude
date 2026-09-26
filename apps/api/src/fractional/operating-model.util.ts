/**
 * Institutional Operating Model (spec V3 §14). Projection annuelle sur
 * l'horizon de détention : GPR → EGI → NOI → CAPEX → coûts plateforme/
 * véhicule → Distributable Cash Flow → Investor Distribution.
 *
 * P0 ne modélise pas le tirage effectif des réserves (reserveTravaux/
 * reserveVacance) année par année — seulement leur montant à date
 * d'acquisition dans le Sources/Uses. Un modèle de trésorerie réserve par
 * réserve est un raffinement P1, pas nécessaire pour valider le rendement
 * annuel.
 */

export interface OperatingModelYearInput {
  year: number;
  /** GPR de l'année — loyers en vigueur, déjà indexés par l'appelant (rentIndexationGrowthPct appliqué en amont). */
  grossPotentialRent: number;
  vacancyCreditLossPct: number;
  opexPct: number;
  capexThisYear: number;
  annualManagementFeePct: number;
  /** Base sur laquelle s'applique annualManagementFeePct — le montant collecté (convention retenue faute de règle plus précise dans le profil plateforme). */
  managementFeeBase: number;
  incomeShareInvestorPct: number;
}

export interface OperatingModelYearResult {
  year: number;
  grossPotentialRent: number;
  vacancyCreditLoss: number;
  effectiveGrossIncome: number;
  operatingExpenses: number;
  noi: number;
  capex: number;
  platformVehicleCosts: number;
  distributableCashFlow: number;
  investorDistribution: number;
}

export function computeOperatingModelYear(input: OperatingModelYearInput): OperatingModelYearResult {
  const vacancyCreditLoss = input.grossPotentialRent * (input.vacancyCreditLossPct / 100);
  const effectiveGrossIncome = input.grossPotentialRent - vacancyCreditLoss;
  const operatingExpenses = effectiveGrossIncome * (input.opexPct / 100);
  const noi = effectiveGrossIncome - operatingExpenses;
  const platformVehicleCosts = input.managementFeeBase * (input.annualManagementFeePct / 100);
  // Pas de plancher à 0 ici : un CAPEX (ou des coûts plateforme) qui dépasse
  // le NOI de l'année doit rester visible comme un déficit négatif (cf.
  // YearContext.propertyLevelCashFlow dans stakeholder-waterfall.util.ts, qui
  // documente explicitement "NOI - CAPEX de l'année" comme pouvant être
  // négatif) — le zéroter ici masquerait un appel de trésorerie réel. Les
  // consommateurs en aval (ex. stakeholder-waterfall.util.ts) clampent déjà
  // le pool à 0 là où c'est financièrement correct (pas de frais négatifs,
  // pas de distribution négative aux tiers).
  const distributableCashFlow = noi - input.capexThisYear - platformVehicleCosts;
  const investorDistribution = distributableCashFlow * (input.incomeShareInvestorPct / 100);

  return {
    year: input.year,
    grossPotentialRent: input.grossPotentialRent,
    vacancyCreditLoss,
    effectiveGrossIncome,
    operatingExpenses,
    noi,
    capex: input.capexThisYear,
    platformVehicleCosts,
    distributableCashFlow,
    investorDistribution,
  };
}

export interface TerminalProceedsInput {
  exitValue: number;
  sellingCostsPct: number;
  capitalInvested: number;
  capitalGainShareInvestorPct: number;
}

export interface TerminalProceedsResult {
  netSaleProceeds: number;
  capitalGain: number;
  investorTerminalProceeds: number;
}

/**
 * Terminal Proceeds (spec §14) : prix de sortie − coûts − waterfall.
 * Convention retenue (P0, à confirmer par le profil plateforme réel) :
 * retour de capital investisseur en priorité, puis split du gain de capital
 * selon capitalGainShareInvestorPct — pas de fiscalité modélisée (taxes,
 * spec §14, différé).
 */
export function computeTerminalProceeds(input: TerminalProceedsInput): TerminalProceedsResult {
  const netSaleProceeds = input.exitValue * (1 - input.sellingCostsPct / 100);
  const capitalGain = Math.max(0, netSaleProceeds - input.capitalInvested);
  const investorTerminalProceeds = Math.min(input.capitalInvested, netSaleProceeds) + capitalGain * (input.capitalGainShareInvestorPct / 100);

  return { netSaleProceeds, capitalGain, investorTerminalProceeds };
}
