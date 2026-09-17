import { computePrequalCovenants, type PrequalCovenantInput } from './prequal-covenant.util';

function input(overrides: Partial<PrequalCovenantInput> = {}): PrequalCovenantInput {
  return {
    projectType: 'PROPERTY_TRADING_WITH_WORKS',
    ltvPct: 60,
    financingInterestOnDurationCible: 100_000,
    totalFinancingExposure: 1_000_000,
    resultatOperationnelEstime: null,
    fluxTresorerieDisponibleEstime: null,
    ...overrides,
  };
}

describe('computePrequalCovenants', () => {
  it('applique les seuils du type de projet et détecte une rupture LTV', () => {
    const result = computePrequalCovenants(input({ ltvPct: 90 }));
    expect(result.ltvBreached).toBe(true);
  });

  it('LTV sous le seuil est OK', () => {
    const result = computePrequalCovenants(input({ ltvPct: 10 }));
    expect(result.ltvBreached).toBe(false);
  });

  it('ICR/DSCR restent null tant que le résultat opérationnel / flux de trésorerie ne sont pas saisis', () => {
    const result = computePrequalCovenants(input());
    expect(result.icr).toBeNull();
    expect(result.dscr).toBeNull();
    expect(result.icrBreached).toBeNull();
    expect(result.dscrBreached).toBeNull();
  });

  it('ICR se calcule quand le résultat opérationnel est saisi et des intérêts existent', () => {
    const result = computePrequalCovenants(input({ resultatOperationnelEstime: 150_000, financingInterestOnDurationCible: 100_000 }));
    expect(result.icr).toBe(1.5);
    expect(result.icrBreached).toBe(false);
  });

  it('DSCR se calcule quand le flux de trésorerie est saisi et un encours existe', () => {
    const result = computePrequalCovenants(input({ fluxTresorerieDisponibleEstime: 900_000, totalFinancingExposure: 1_000_000 }));
    expect(result.dscr).toBe(0.9);
    expect(result.dscrBreached).toBe(true);
  });

  it('un type de projet null retombe sur les seuils par défaut', () => {
    const result = computePrequalCovenants(input({ projectType: null, ltvPct: 76 }));
    expect(result.ltvThresholdPct).toBe(75);
    expect(result.ltvBreached).toBe(true);
  });
});
