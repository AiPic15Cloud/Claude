import { computeAllDealEconomicsStressScenarios, buildScenarioWaterfallInput, type DealEconomicsScenarioContext } from './stakeholder-waterfall-stress.util';
import { computeStakeholderWaterfall } from './stakeholder-waterfall.util';
import type { StressScenarioKey } from './stress-testing.util';

/**
 * Exigence explicite : "voir l'effet d'une vacance ou d'un défaut locataire
 * sur le TRI de l'investisseur" — pas seulement sur le split simple
 * investisseur/plateforme (stress-testing.util.ts), mais aussi à travers le
 * moteur multi-stakeholder (Deal Economics, spec §29.9).
 */

const context: DealEconomicsScenarioContext = {
  asOfDate: new Date('2026-01-01'),
  holdPeriodYears: 6,
  vacancyCreditLossPct: 3,
  opexPct: 15,
  rentGrowthPctPerYear: 1.5,
  leases: [
    { id: 'l1', loyerFacialAnnuel: 200000, indexation: 'AUTRE', indexationCapPct: null, indexationFloorPct: null },
    { id: 'l2', loyerFacialAnnuel: 73678, indexation: 'AUTRE', indexationCapPct: null, indexationFloorPct: null },
  ],
  capexByYear: {},
  exitValueBase: 3400000,
  sellingCostsPct: 6,
  coutTotal: 3250000,
  prixNetVendeur: 3000000,
  collecteMontant: 3250000,
  stakeholders: [{ id: 'investor', role: 'INVESTOR', name: 'Investisseur', capitalEngaged: 3250000 }],
  feeDefinitions: [],
  tiers: [{ id: 't1', beneficiaryStakeholderId: 'investor', order: 1, type: 'RESIDUAL_SPLIT', hurdleRatePct: null, catchUpPct: null, sharePct: 100 }],
  hurdlePct: 5,
  hasPlatformProfile: true,
};

describe('computeAllDealEconomicsStressScenarios', () => {
  const scenarios = computeAllDealEconomicsStressScenarios(context);
  const byScenario = new Map(scenarios.map((s) => [s.scenario, s.result]));
  const investorIrr = (scenario: StressScenarioKey) => byScenario.get(scenario)!.stakeholders.find((s) => s.role === 'INVESTOR')!.irrPct!;

  it('calcule les 10 scénarios, tous réconciliés à 100%', () => {
    expect(scenarios).toHaveLength(10);
    for (const s of scenarios) expect(s.result.reconciled).toBe(true);
  });

  it('VACANCY réduit le TRI investisseur par rapport à BASE', () => {
    expect(investorIrr('VACANCY')).toBeLessThan(investorIrr('BASE'));
  });

  it('TENANT_DEFAULT réduit le TRI investisseur par rapport à BASE', () => {
    expect(investorIrr('TENANT_DEFAULT')).toBeLessThan(investorIrr('BASE'));
  });

  it('COMBINED_SEVERE est strictement pire que VACANCY seule', () => {
    expect(investorIrr('COMBINED_SEVERE')).toBeLessThan(investorIrr('VACANCY'));
  });
});

describe('buildScenarioWaterfallInput — RENT_DOWNSIDE', () => {
  it('force la croissance des loyers à 0, y compris les taux d\'indexation de marché', () => {
    const withIndex: DealEconomicsScenarioContext = { ...context, indexGrowthRates: { ILC: 6 } };
    const input = buildScenarioWaterfallInput(withIndex, 'RENT_DOWNSIDE');
    // Sans le zérotage d'indexGrowthRates, l'année 2 croîtrait de 6% malgré le scénario RENT_DOWNSIDE.
    const gprYear1 = input.years[0].grossPotentialRent;
    const gprYear2 = input.years[1].grossPotentialRent;
    expect(gprYear2).toBeCloseTo(gprYear1, 2);
  });
});

describe('buildScenarioWaterfallInput — TENANT_DEFAULT', () => {
  it('exclut le bail au loyer le plus élevé', () => {
    const input = buildScenarioWaterfallInput(context, 'TENANT_DEFAULT');
    const result = computeStakeholderWaterfall(input);
    const baseInput = buildScenarioWaterfallInput(context, 'BASE');
    const baseResult = computeStakeholderWaterfall(baseInput);
    const investor = result.stakeholders.find((s) => s.role === 'INVESTOR')!;
    const baseInvestor = baseResult.stakeholders.find((s) => s.role === 'INVESTOR')!;
    expect(investor.totalReceipts).toBeLessThan(baseInvestor.totalReceipts);
  });
});
