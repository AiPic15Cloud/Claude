/**
 * Valorisation DCF (Discounted Cash Flow) — complète le Returns Engine
 * (§15, IRR/multiple sur les distributions investisseur) par une
 * valorisation de l'actif lui-même : la somme actualisée des cash-flows
 * "niveau propriété" (NOI - CAPEX, avant frais plateforme/waterfall) sur
 * l'horizon de détention, plus la valeur terminale actualisée (reprise du
 * prix de sortie déjà retenu par le dossier — Sources & Uses, dernière
 * FractionalValuation, ou override AssumptionSet). C'est une méthode DCF
 * "explicite + reversion", pas une perpétuité de Gordon — cohérent avec le
 * reste du module qui modélise déjà une sortie explicite en fin d'horizon
 * plutôt qu'une croissance infinie.
 *
 * Le taux d'actualisation (discountRatePct) est une hypothèse saisie par
 * dossier (AssumptionSet), distincte du hurdle plateforme : le hurdle est
 * un critère d'éligibilité pour l'investisseur, le taux d'actualisation DCF
 * est un jugement de valeur de marché sur le risque de l'actif — les deux
 * peuvent légitimement diverger.
 */

export interface DCFYearInput {
  year: number;
  noi: number;
  capex: number;
}

export interface DCFYearCashFlow {
  year: number;
  /** NOI - CAPEX de l'année — cash-flow "niveau propriété", avant frais plateforme/waterfall. */
  propertyLevelCashFlow: number;
  discountFactor: number;
  presentValue: number;
}

export interface DCFValuationInput {
  yearlyCashFlows: DCFYearInput[];
  discountRatePct: number;
  /** Valeur de sortie retenue par le dossier, actualisée comme valeur terminale (reversion) — pas une perpétuité de Gordon. */
  terminalValue: number;
}

export interface DCFValuationResult {
  discountRatePct: number;
  yearlyCashFlows: DCFYearCashFlow[];
  presentValueOfCashFlows: number;
  terminalValue: number;
  presentValueOfTerminalValue: number;
  /** Valeur DCF de l'actif = somme des cash-flows actualisés + valeur terminale actualisée. */
  totalValue: number;
}

export function computeDCFValuation(input: DCFValuationInput): DCFValuationResult {
  const rate = input.discountRatePct / 100;

  const yearlyCashFlows: DCFYearCashFlow[] = input.yearlyCashFlows.map((y) => {
    const propertyLevelCashFlow = y.noi - y.capex;
    const discountFactor = 1 / Math.pow(1 + rate, y.year);
    return { year: y.year, propertyLevelCashFlow, discountFactor, presentValue: propertyLevelCashFlow * discountFactor };
  });

  const presentValueOfCashFlows = yearlyCashFlows.reduce((sum, y) => sum + y.presentValue, 0);

  const lastYear = input.yearlyCashFlows.length > 0 ? input.yearlyCashFlows[input.yearlyCashFlows.length - 1].year : 0;
  const terminalDiscountFactor = 1 / Math.pow(1 + rate, lastYear);
  const presentValueOfTerminalValue = input.terminalValue * terminalDiscountFactor;

  return {
    discountRatePct: input.discountRatePct,
    yearlyCashFlows,
    presentValueOfCashFlows,
    terminalValue: input.terminalValue,
    presentValueOfTerminalValue,
    totalValue: presentValueOfCashFlows + presentValueOfTerminalValue,
  };
}
