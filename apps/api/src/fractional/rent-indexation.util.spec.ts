import { computeIndexGrowthRates, resolveLeaseGrowthPct, projectIndexedGpr } from './rent-indexation.util';

describe('computeIndexGrowthRates', () => {
  it('retient le cagr5y de la serie la plus recente par type d\'indice', () => {
    const rates = computeIndexGrowthRates([
      { indexType: 'ILC', cagr5y: 3.0, asOfDate: new Date('2025-06-30') },
      { indexType: 'ILC', cagr5y: 4.5, asOfDate: new Date('2026-06-30') }, // plus recente
      { indexType: 'ILAT', cagr5y: 2.0, asOfDate: new Date('2026-03-31') },
    ]);
    expect(rates).toEqual({ ILC: 4.5, ILAT: 2.0 });
  });

  it('ignore les series sans cagr5y renseigne (jamais un 0% invente)', () => {
    const rates = computeIndexGrowthRates([{ indexType: 'IRL', cagr5y: null, asOfDate: new Date('2026-01-01') }]);
    expect(rates).toEqual({});
  });

  it('renvoie un objet vide si aucune serie n\'est fournie', () => {
    expect(computeIndexGrowthRates([])).toEqual({});
  });
});

describe('resolveLeaseGrowthPct', () => {
  const rates = { ILC: 4.5, ILAT: 2.0 };

  it('utilise le taux de marche quand l\'indice a une serie connue', () => {
    expect(resolveLeaseGrowthPct({ indexation: 'ILC', indexationCapPct: null, indexationFloorPct: null }, rates, 1.5)).toBe(4.5);
  });

  it('retombe sur le taux de repli pour une indexation AUTRE', () => {
    expect(resolveLeaseGrowthPct({ indexation: 'AUTRE', indexationCapPct: null, indexationFloorPct: null }, rates, 1.5)).toBe(1.5);
  });

  it('retombe sur le taux de repli si l\'indice n\'a pas de serie disponible', () => {
    expect(resolveLeaseGrowthPct({ indexation: 'ICC', indexationCapPct: null, indexationFloorPct: null }, rates, 1.5)).toBe(1.5);
  });

  it('applique le plafond contractuel', () => {
    expect(resolveLeaseGrowthPct({ indexation: 'ILC', indexationCapPct: 2, indexationFloorPct: null }, rates, 1.5)).toBe(2);
  });

  it('applique le plancher contractuel', () => {
    expect(resolveLeaseGrowthPct({ indexation: 'ILAT', indexationCapPct: null, indexationFloorPct: 3 }, rates, 1.5)).toBe(3);
  });
});

describe('projectIndexedGpr', () => {
  const rates = { ILC: 4.5 };
  const leases = [
    { loyerFacialAnnuel: 100000, indexation: 'ILC' as const, indexationCapPct: null, indexationFloorPct: null },
    { loyerFacialAnnuel: 50000, indexation: 'AUTRE' as const, indexationCapPct: null, indexationFloorPct: null },
  ];

  it('annee 1 = somme des loyers faciaux, sans effet de la croissance', () => {
    expect(projectIndexedGpr(leases, rates, 1.5, 1)).toBe(150000);
  });

  it('compose chaque bail a son propre taux au fil des annees', () => {
    const year3 = projectIndexedGpr(leases, rates, 1.5, 3);
    const expected = 100000 * Math.pow(1.045, 2) + 50000 * Math.pow(1.015, 2);
    expect(year3).toBeCloseTo(expected, 6);
  });
});
