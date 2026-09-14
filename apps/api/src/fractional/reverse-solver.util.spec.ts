import { solveMaxAcquisitionPrice, solveMinSecuredRent, solveMaxVacancyCreditLossPct, solveMaxAdditionalCapex, solveLeasesToSecure } from './reverse-solver.util';
import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';
import type { LeaseInput } from './lease-security.util';

const asOfDate = new Date('2026-01-01');

function makeBaseInput(overrides: Partial<ReturnsEngineInput> = {}, leases?: LeaseInput[]): ReturnsEngineInput {
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
    leases: leases ?? [
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
        ervAnnuel: null,
      },
    ],
    holdPeriodYears: 5,
    vacancyCreditLossPct: 0,
    opexPct: 0,
    annualManagementFeePct: 0,
    incomeShareInvestorPct: 100,
    capitalGainShareInvestorPct: 100,
    rentGrowthPctPerYear: 0,
    exitValue: 1000000,
    sellingCostsPct: 0,
    ...overrides,
  };
}

describe('solveMaxAcquisitionPrice / solveMinSecuredRent (P0 existants — non-regression)', () => {
  it('trouve un prix maximum plausible pour un hurdle atteignable', () => {
    const result = solveMaxAcquisitionPrice(makeBaseInput(), 5);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeGreaterThan(0);
  });

  it('un prix plus eleve degrade le secured net yield (collecteMontant absorbe l\'ecart de prix, sinon le yield ne bouge jamais avec le prix)', () => {
    const base = makeBaseInput();
    const yieldAtBasePrice = computeReturnsEngine(base).securedNetYieldPct;
    const higherPrice = base.sourcesUses.prixNetVendeur * 1.5;
    const yieldAtHigherPrice = computeReturnsEngine({
      ...base,
      sourcesUses: { ...base.sourcesUses, prixNetVendeur: higherPrice, collecteMontant: base.sourcesUses.collecteMontant + (higherPrice - base.sourcesUses.prixNetVendeur) },
    }).securedNetYieldPct;
    expect(yieldAtHigherPrice).toBeLessThan(yieldAtBasePrice);
  });

  it('renvoie null si le hurdle est hors de portée meme aux bornes', () => {
    const result = solveMinSecuredRent(makeBaseInput(), 500); // hurdle irréaliste
    expect(result.value).toBeNull();
  });
});

describe('solveMaxVacancyCreditLossPct', () => {
  it('trouve une vacance maximale positive pour un hurdle bas', () => {
    const result = solveMaxVacancyCreditLossPct(makeBaseInput(), 5);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeGreaterThan(0);
    expect(result.value!).toBeLessThanOrEqual(90);
  });

  it('une vacance plus elevee degrade toujours le secured net yield (monotonie)', () => {
    const yieldAt0 = computeReturnsEngine(makeBaseInput({ vacancyCreditLossPct: 0 })).securedNetYieldPct;
    const yieldAt10 = computeReturnsEngine(makeBaseInput({ vacancyCreditLossPct: 10 })).securedNetYieldPct;
    expect(yieldAt10).toBeLessThan(yieldAt0);
  });

  it('renvoie null si meme 0% de vacance ne suffit pas a tenir un hurdle irrealiste', () => {
    const result = solveMaxVacancyCreditLossPct(makeBaseInput(), 500);
    expect(result.value).toBeNull();
  });
});

describe('solveMaxAdditionalCapex', () => {
  it('trouve un budget CAPEX supplementaire positif pour un hurdle bas', () => {
    const result = solveMaxAdditionalCapex(makeBaseInput(), 5);
    expect(result.value).not.toBeNull();
    expect(result.value!).toBeGreaterThan(0);
  });

  it('conserve le CAPEX annee 1 deja saisi comme base, il ne le remplace pas', () => {
    const withExisting = solveMaxAdditionalCapex(makeBaseInput({ capexByYear: { 1: 10000 } }), 5);
    const withoutExisting = solveMaxAdditionalCapex(makeBaseInput({ capexByYear: {} }), 5);
    // Avec du CAPEX deja engage en annee 1, la marge supplementaire disponible est plus faible.
    expect(withExisting.value).not.toBeNull();
    expect(withoutExisting.value).not.toBeNull();
    expect(withExisting.value!).toBeLessThan(withoutExisting.value!);
  });
});

describe('solveLeasesToSecure', () => {
  it('renvoie une liste vide si le hurdle est deja atteint sans rien securiser', () => {
    const result = solveLeasesToSecure(makeBaseInput(), 5);
    expect(result.leasesToSecure).toEqual([]);
  });

  it('identifie le ou les baux dont la securisation ramene le secured net yield au-dessus du hurdle', () => {
    const leases: LeaseInput[] = [
      {
        id: 'secured',
        tenantName: 'Locataire securise',
        loyerFacialAnnuel: 30000,
        dateEffet: new Date('2020-01-01'),
        dateTerme: new Date('2036-01-01'),
        breakDates: [],
        statutRenouvellement: 'SIGNE',
        indexation: 'AUTRE',
        indexationCapPct: null,
        indexationFloorPct: null,
        ervAnnuel: null,
      },
      {
        id: 'unsecured',
        tenantName: 'Locataire a securiser',
        loyerFacialAnnuel: 70000,
        dateEffet: new Date('2020-01-01'),
        dateTerme: new Date('2026-06-01'), // echeance proche -> non securise
        breakDates: [],
        statutRenouvellement: 'EN_COURS',
        indexation: 'AUTRE',
        indexationCapPct: null,
        indexationFloorPct: null,
        ervAnnuel: null,
      },
    ];
    const base = makeBaseInput({}, leases);
    const baseYield = solveLeasesToSecure(base, 0).achievedYieldPct; // hurdle 0 -> pas de securisation necessaire, juste pour lire le yield de base
    const result = solveLeasesToSecure(base, baseYield + 1); // hurdle legerement au-dessus du yield actuel
    expect(result.leasesToSecure).not.toBeNull();
    expect(result.leasesToSecure!.some((l) => l.leaseId === 'unsecured')).toBe(true);
  });

  it('renvoie null si securiser tous les baux disponibles ne suffit pas', () => {
    const leases: LeaseInput[] = [
      {
        id: 'l1',
        tenantName: 'Locataire',
        loyerFacialAnnuel: 100000,
        dateEffet: new Date('2020-01-01'),
        dateTerme: new Date('2026-06-01'),
        breakDates: [],
        statutRenouvellement: 'EN_COURS',
        indexation: 'AUTRE',
        indexationCapPct: null,
        indexationFloorPct: null,
        ervAnnuel: null,
      },
    ];
    const result = solveLeasesToSecure(makeBaseInput({}, leases), 500); // hurdle irréaliste
    expect(result.leasesToSecure).toBeNull();
  });
});
