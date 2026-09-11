import { computeDCFValuation } from './dcf-valuation.util';

describe('computeDCFValuation', () => {
  it('actualise chaque cash-flow annuel (NOI - CAPEX) au taux donné', () => {
    const result = computeDCFValuation({
      yearlyCashFlows: [{ year: 1, noi: 100000, capex: 0 }],
      discountRatePct: 7,
      terminalValue: 0,
    });
    expect(result.yearlyCashFlows[0].propertyLevelCashFlow).toBe(100000);
    expect(result.yearlyCashFlows[0].presentValue).toBeCloseTo(100000 / 1.07, 6);
  });

  it('déduit le CAPEX du NOI avant actualisation', () => {
    const result = computeDCFValuation({
      yearlyCashFlows: [{ year: 1, noi: 100000, capex: 20000 }],
      discountRatePct: 7,
      terminalValue: 0,
    });
    expect(result.yearlyCashFlows[0].propertyLevelCashFlow).toBe(80000);
  });

  it('actualise la valeur terminale à la dernière année de l\'horizon, pas à t0', () => {
    const result = computeDCFValuation({
      yearlyCashFlows: [
        { year: 1, noi: 100000, capex: 0 },
        { year: 2, noi: 100000, capex: 0 },
      ],
      discountRatePct: 10,
      terminalValue: 1000000,
    });
    expect(result.presentValueOfTerminalValue).toBeCloseTo(1000000 / Math.pow(1.1, 2), 4);
  });

  it('totalValue = somme des cash-flows actualisés + valeur terminale actualisée', () => {
    const result = computeDCFValuation({
      yearlyCashFlows: [
        { year: 1, noi: 100000, capex: 0 },
        { year: 2, noi: 100000, capex: 0 },
      ],
      discountRatePct: 8,
      terminalValue: 500000,
    });
    expect(result.totalValue).toBeCloseTo(result.presentValueOfCashFlows + result.presentValueOfTerminalValue, 6);
  });

  it('un taux d\'actualisation plus élevé réduit la valeur DCF (toutes choses égales par ailleurs)', () => {
    const base = { yearlyCashFlows: [{ year: 1, noi: 100000, capex: 0 }, { year: 2, noi: 100000, capex: 0 }], terminalValue: 1000000 };
    const lowRate = computeDCFValuation({ ...base, discountRatePct: 5 });
    const highRate = computeDCFValuation({ ...base, discountRatePct: 10 });
    expect(highRate.totalValue).toBeLessThan(lowRate.totalValue);
  });

  it('gère un horizon vide (aucun cash-flow, uniquement une valeur terminale à t0)', () => {
    const result = computeDCFValuation({ yearlyCashFlows: [], discountRatePct: 7, terminalValue: 1000000 });
    expect(result.presentValueOfCashFlows).toBe(0);
    expect(result.presentValueOfTerminalValue).toBe(1000000); // année 0 => pas d'actualisation
    expect(result.totalValue).toBe(1000000);
  });
});
