import { computeAllStressScenarios, ALL_STRESS_SCENARIOS } from './stress-testing.util';
import type { ReturnsEngineInput } from './returns.util';
import type { LeaseInput } from './lease-security.util';

const leases: LeaseInput[] = [
  {
    id: 'l1',
    tenantName: 'Gros locataire',
    loyerFacialAnnuel: 200000,
    dateEffet: new Date('2020-01-01'),
    dateTerme: new Date('2032-01-01'),
    breakDates: [],
    statutRenouvellement: 'SIGNE',
    indexation: 'AUTRE',
    indexationCapPct: null,
    indexationFloorPct: null,
  },
  {
    id: 'l2',
    tenantName: 'Petit locataire',
    loyerFacialAnnuel: 73678,
    dateEffet: new Date('2020-01-01'),
    dateTerme: new Date('2032-01-01'),
    breakDates: [],
    statutRenouvellement: 'SIGNE',
    indexation: 'AUTRE',
    indexationCapPct: null,
    indexationFloorPct: null,
  },
];

const baseInput: ReturnsEngineInput = {
  asOfDate: new Date('2026-01-01'),
  sourcesUses: {
    prixNetVendeur: 3000000,
    droitsNotaire: 200000,
    honoraires: 50000,
    travauxInitiaux: 0,
    capexDiffereReserve: 0,
    fraisPlateformeEntree: 0,
    reserveVacance: 0,
    reserveTravaux: 0,
    reserveTresorerie: 0,
    collecteMontant: 3250000,
    sponsorEquity: 0,
    detteEventuelle: 0,
    autresSources: 0,
  },
  leases,
  holdPeriodYears: 6,
  vacancyCreditLossPct: 3,
  opexPct: 15,
  annualManagementFeePct: 1,
  incomeShareInvestorPct: 100,
  capitalGainShareInvestorPct: 100,
  rentGrowthPctPerYear: 1.5,
  capexByYear: { 2: 50000, 4: 30000 },
  exitValue: 3400000,
  sellingCostsPct: 6,
};

describe('computeAllStressScenarios', () => {
  const scenarios = computeAllStressScenarios(baseInput, 5);
  const byKey = new Map(scenarios.map((s) => [s.scenario, s]));

  it('calcule les 10 scenarios sans erreur', () => {
    expect(scenarios).toHaveLength(10);
    expect(scenarios.map((s) => s.scenario).sort()).toEqual([...ALL_STRESS_SCENARIOS].sort());
  });

  it('VACANCY reduit le TRI investisseur par rapport a BASE', () => {
    expect(byKey.get('VACANCY')!.irrPct).toBeLessThan(byKey.get('BASE')!.irrPct!);
  });

  it('TENANT_DEFAULT (exclusion du plus gros bail) reduit le TRI investisseur par rapport a BASE', () => {
    expect(byKey.get('TENANT_DEFAULT')!.irrPct).toBeLessThan(byKey.get('BASE')!.irrPct!);
  });

  it('COMBINED_SEVERE est strictement pire que VACANCY seule', () => {
    expect(byKey.get('COMBINED_SEVERE')!.irrPct).toBeLessThan(byKey.get('VACANCY')!.irrPct!);
  });

  it('CAPEX_OVERRUN et OPEX_INCREASE deteriorent aussi le TRI par rapport a BASE', () => {
    expect(byKey.get('CAPEX_OVERRUN')!.irrPct).toBeLessThan(byKey.get('BASE')!.irrPct!);
    expect(byKey.get('OPEX_INCREASE')!.irrPct).toBeLessThan(byKey.get('BASE')!.irrPct!);
  });

  it('VALUE_DECLINE reduit le multiple par rapport a BASE', () => {
    expect(byKey.get('VALUE_DECLINE')!.equityMultiple).toBeLessThan(byKey.get('BASE')!.equityMultiple!);
  });
});
