import { computeCapRateBuildUp, compareToImpliedCapRate, type CapRateBuildUpInput } from './cap-rate-build-up.util';

function input(overrides: Partial<CapRateBuildUpInput> = {}): CapRateBuildUpInput {
  return { tec10Pct: 3, propertyCondition: 'CORE', locationTier: 'PARIS_QCA', marketDepth: 'PROFOND', walbYears: 6, ...overrides };
}

describe('computeCapRateBuildUp', () => {
  it('CORE / Paris QCA / marché profond / WALB long -> cap rate = TEC10 seul (toutes primes nulles)', () => {
    const result = computeCapRateBuildUp(input());
    expect(result.conditionPremiumPct).toBe(0);
    expect(result.locationPremiumPct).toBe(0);
    expect(result.liquidityPremiumPct).toBe(0);
    expect(result.capRatePct).toBe(3);
  });

  it('additionne les primes correctement pour un profil dégradé', () => {
    const result = computeCapRateBuildUp(input({ propertyCondition: 'VALUE_ADD', locationTier: 'TERTIAIRE_B', marketDepth: 'MOYEN', walbYears: 1 }));
    expect(result.conditionPremiumPct).toBe(1.5);
    expect(result.locationPremiumPct).toBe(2);
    expect(result.liquidityPremiumPct).toBe(1.75); // MOYEN + walb<2
    expect(result.capRatePct).toBeCloseTo(3 + 1.5 + 2 + 1.75, 6);
  });

  it('WALB indisponible traité comme le pire cas de la ligne — jamais un 0% implicite', () => {
    const withWalb = computeCapRateBuildUp(input({ marketDepth: 'FAIBLE', walbYears: 1 }));
    const withoutWalb = computeCapRateBuildUp(input({ marketDepth: 'FAIBLE', walbYears: null }));
    expect(withoutWalb.liquidityPremiumPct).toBe(withWalb.liquidityPremiumPct);
    expect(withoutWalb.liquidityPremiumPct).toBe(3.5);
  });

  it.each([
    [5, 0],
    [4.99, 0.25],
    [2, 0.25],
    [1.99, 0.75],
    [0, 0.75],
  ] as const)('WALB %d ans (PROFOND) -> prime liquidité %d pts', (walbYears, expected) => {
    expect(computeCapRateBuildUp(input({ marketDepth: 'PROFOND', walbYears })).liquidityPremiumPct).toBe(expected);
  });

  it('DISTRESSED + TERTIAIRE_C + FAIBLE + WALB court cumule les 4 composantes au maximum', () => {
    const result = computeCapRateBuildUp(input({ propertyCondition: 'DISTRESSED', locationTier: 'TERTIAIRE_C', marketDepth: 'FAIBLE', walbYears: 0.5 }));
    expect(result.capRatePct).toBeCloseTo(3 + 5 + 3 + 3.5, 6);
  });

  it('esgPremiumPct absent (aucune evaluation ESG saisie) -> 0, jamais un pire-cas injecte en silence', () => {
    const result = computeCapRateBuildUp(input());
    expect(result.esgPremiumPct).toBe(0);
    expect(result.capRatePct).toBe(3);
  });

  it('esgPremiumPct fourni s\'ajoute aux autres primes, comme une composante nommee de plus', () => {
    const result = computeCapRateBuildUp(input({ esgPremiumPct: 2.5 }));
    expect(result.esgPremiumPct).toBe(2.5);
    expect(result.capRatePct).toBeCloseTo(3 + 2.5, 6);
  });
});

describe('compareToImpliedCapRate', () => {
  it('gap positif quand le prix payé est plus décoté (rendement implicite supérieur) que le cap rate Atlas', () => {
    const buildUp = computeCapRateBuildUp(input());
    const result = compareToImpliedCapRate(buildUp, 5);
    expect(result.gapPts).toBeCloseTo(2, 6);
  });

  it('gap négatif quand le prix payé est plus cher (rendement implicite inférieur) que le cap rate Atlas — la thèse dépend d\'une compression de taux', () => {
    const buildUp = computeCapRateBuildUp(input());
    const result = compareToImpliedCapRate(buildUp, 2.5);
    expect(result.gapPts).toBeCloseTo(-0.5, 6);
  });
});
