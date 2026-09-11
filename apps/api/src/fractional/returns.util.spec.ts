import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';
import type { LeaseInput } from './lease-security.util';

const asOfDate = new Date('2026-01-01');

function makeBaseInput(overrides: Partial<ReturnsEngineInput> = {}, leaseOverrides: Partial<LeaseInput> = {}): ReturnsEngineInput {
  const leases: LeaseInput[] = [
    {
      id: 'l1',
      tenantName: 'Locataire',
      loyerFacialAnnuel: 100000,
      dateEffet: new Date('2020-01-01'),
      dateTerme: new Date('2032-01-01'),
      breakDates: [],
      statutRenouvellement: 'SIGNE',
      indexation: 'AUTRE',
      indexationCapPct: null,
      indexationFloorPct: null,
      ...leaseOverrides,
    },
  ];

  return {
    asOfDate,
    sourcesUses: {
      prixNetVendeur: 1000000,
      droitsNotaire: 0,
      honoraires: 0,
      travauxInitiaux: 0,
      capexDiffereReserve: 0,
      fraisPlateformeEntree: 0,
      reserveVacance: 0,
      reserveTravaux: 0,
      reserveTresorerie: 0,
      collecteMontant: 1000000,
      sponsorEquity: 0,
      detteEventuelle: 0,
      autresSources: 0,
    },
    leases,
    holdPeriodYears: 5,
    vacancyCreditLossPct: 0,
    opexPct: 0,
    annualManagementFeePct: 0,
    incomeShareInvestorPct: 100,
    capitalGainShareInvestorPct: 100,
    rentGrowthPctPerYear: 1.5,
    exitValue: 1000000,
    sellingCostsPct: 0,
    ...overrides,
  };
}

describe('computeReturnsEngine', () => {
  it('calcule un Gross Yield cohérent (loyer / prix net vendeur)', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.grossYieldPct).toBeCloseTo(10, 6); // 100000 / 1000000
  });

  it('la première année de projection est toujours égale au loyer facial, quel que soit le taux de croissance', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.yearlyModel[0].grossPotentialRent).toBeCloseTo(100000, 6);
  });

  it('sans série de marché disponible, retombe sur la croissance de repli (AssumptionSet)', () => {
    const result = computeReturnsEngine(makeBaseInput());
    const expectedYear5 = 100000 * Math.pow(1.015, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('un bail indexé sur un indice avec série de marché connue utilise ce taux plutôt que la croissance de repli', () => {
    const result = computeReturnsEngine(makeBaseInput({ indexGrowthRates: { ILC: 4.5 } }, { indexation: 'ILC' }));
    const expectedYear5 = 100000 * Math.pow(1.045, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('un plafond contractuel d\'indexation borne la croissance appliquée', () => {
    const result = computeReturnsEngine(makeBaseInput({ indexGrowthRates: { ILC: 10 } }, { indexation: 'ILC', indexationCapPct: 3 }));
    const expectedYear5 = 100000 * Math.pow(1.03, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('renvoie un TRI et un multiple définis pour un cas simple rentable', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.irrPct).not.toBeNull();
    expect(result.equityMultiple).not.toBeNull();
    expect(result.equityMultiple!).toBeGreaterThan(0);
  });
});
