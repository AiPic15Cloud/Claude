import { computeOperatingModelYear } from './operating-model.util';

describe('computeOperatingModelYear', () => {
  it('déduit le CAPEX et les coûts plateforme du NOI pour obtenir le distributable cash flow', () => {
    const result = computeOperatingModelYear({
      year: 1,
      grossPotentialRent: 500000,
      vacancyCreditLossPct: 0,
      opexPct: 0,
      capexThisYear: 100000,
      annualManagementFeePct: 0,
      managementFeeBase: 0,
      incomeShareInvestorPct: 100,
    });
    expect(result.noi).toBe(500000);
    expect(result.distributableCashFlow).toBe(400000);
  });

  it('regression : un CAPEX qui dépasse le NOI de l\'année laisse un distributable cash flow négatif au lieu de le plancher à 0', () => {
    // NOI = 100 000, CAPEX = 250 000 (chantier imprévu) => déficit réel de 150 000.
    const result = computeOperatingModelYear({
      year: 1,
      grossPotentialRent: 100000,
      vacancyCreditLossPct: 0,
      opexPct: 0,
      capexThisYear: 250000,
      annualManagementFeePct: 0,
      managementFeeBase: 0,
      incomeShareInvestorPct: 100,
    });
    expect(result.noi).toBe(100000);
    // Avant le fix : Math.max(0, ...) aurait silencieusement rendu 0 ici,
    // masquant l'appel de trésorerie réel de 150 000.
    expect(result.distributableCashFlow).toBe(-150000);
  });

  it('propage le déficit négatif à investorDistribution (appel de trésorerie investisseur), pas un plancher à 0', () => {
    const result = computeOperatingModelYear({
      year: 1,
      grossPotentialRent: 100000,
      vacancyCreditLossPct: 0,
      opexPct: 0,
      capexThisYear: 250000,
      annualManagementFeePct: 0,
      managementFeeBase: 0,
      incomeShareInvestorPct: 80,
    });
    expect(result.investorDistribution).toBe(-150000 * 0.8);
  });

  it('des coûts plateforme qui, cumulés au CAPEX, dépassent le NOI produisent aussi un distributable cash flow négatif', () => {
    const result = computeOperatingModelYear({
      year: 1,
      grossPotentialRent: 200000,
      vacancyCreditLossPct: 0,
      opexPct: 0,
      capexThisYear: 150000,
      annualManagementFeePct: 5,
      managementFeeBase: 1000000, // 5% x 1 000 000 = 50 000 de coûts plateforme
      incomeShareInvestorPct: 100,
    });
    // NOI 200 000 - CAPEX 150 000 - coûts plateforme 50 000 = 0 pile.
    expect(result.distributableCashFlow).toBe(0);
  });
});
