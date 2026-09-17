import { computePrequalFinancials, type PrequalFinancialInput } from './prequal-financial.util';

function input(overrides: Partial<PrequalFinancialInput> = {}): PrequalFinancialInput {
  return {
    costLineItems: [
      { category: 'ACQUISITION_FONCIERE', label: 'Terrain', amount: 30_000_000 },
      { category: 'TRAVAUX', label: 'Gros œuvre', amount: 20_000_000 },
    ],
    lots: [
      { label: 'Lot A', surfaceSqm: 60, askingPrice: 30_000_000, expectedPrice: null },
      { label: 'Lot B', surfaceSqm: 40, askingPrice: 25_000_000, expectedPrice: 24_000_000 },
    ],
    otherRevenueRetained: null,
    provenEquity: 10_000_000,
    declaredEquity: 12_000_000,
    declaredMarginPct: 20,
    declaredCoutDeRevient: null,
    declaredChiffreAffaires: null,
    amountRequested: 40_000_000,
    landPrice: 30_000_000,
    bankDebt: null,
    includeBankDebtInRatios: false,
    ...overrides,
  };
}

describe('computePrequalFinancials', () => {
  it('calcule le coût de revient comme la somme des postes', () => {
    const result = computePrequalFinancials(input());
    expect(result.coutDeRevient).toBe(50_000_000);
  });

  it('utilise expectedPrice en priorité sur askingPrice pour le chiffre d\'affaires', () => {
    const result = computePrequalFinancials(input());
    // Lot A: askingPrice (30M, pas d'expectedPrice) + Lot B: expectedPrice (24M)
    expect(result.chiffreAffaires).toBe(54_000_000);
    expect(result.lotsWithoutPriceCount).toBe(0);
  });

  it('signale les lots sans prix sans les compter comme 0 (Unknown ≠ Zero)', () => {
    const result = computePrequalFinancials(
      input({ lots: [{ label: 'Lot C', surfaceSqm: 50, askingPrice: null, expectedPrice: null }] }),
    );
    expect(result.chiffreAffaires).toBe(0);
    expect(result.lotsWithoutPriceCount).toBe(1);
  });

  it('marge = CA + autres produits - coût de revient', () => {
    const result = computePrequalFinancials(input({ otherRevenueRetained: 1_000_000 }));
    expect(result.marge).toBe(54_000_000 + 1_000_000 - 50_000_000);
  });

  it('margePct est null si aucun revenu retenu (division par zéro évitée)', () => {
    const result = computePrequalFinancials(input({ lots: [] }));
    expect(result.chiffreAffaires).toBe(0);
    expect(result.margePct).toBeNull();
  });

  it("calcule l'écart entre marge recalculée et marge annoncée en points", () => {
    const result = computePrequalFinancials(input());
    expect(result.margePct).not.toBeNull();
    expect(result.margeEcartVsAnnonceePts).toBeCloseTo(result.margePct! - 20, 5);
  });

  it('écart déclaré est null quand aucune valeur déclarée n\'est fournie', () => {
    const result = computePrequalFinancials(input());
    expect(result.coutDeRevientEcartVsDeclare).toBeNull();
    expect(result.chiffreAffairesEcartVsDeclare).toBeNull();
  });

  it('calcule les écarts coût de revient / CA vs version opérateur quand déclarées', () => {
    const result = computePrequalFinancials(input({ declaredCoutDeRevient: 48_000_000, declaredChiffreAffaires: 55_000_000 }));
    expect(result.coutDeRevientEcartVsDeclare).toBe(50_000_000 - 48_000_000);
    expect(result.chiffreAffairesEcartVsDeclare).toBe(54_000_000 - 55_000_000);
  });

  it('besoin max de financement est null sans apport prouvé', () => {
    const result = computePrequalFinancials(input({ provenEquity: null }));
    expect(result.besoinMaxFinancement).toBeNull();
  });

  it('besoin max de financement = coût de revient - apport prouvé', () => {
    const result = computePrequalFinancials(input());
    expect(result.besoinMaxFinancement).toBe(50_000_000 - 10_000_000);
  });

  it('prix de sortie pondéré ne compte que les lots avec surface ET prix renseignés', () => {
    const result = computePrequalFinancials(
      input({
        lots: [
          { label: 'A', surfaceSqm: 50, askingPrice: 25_000_000, expectedPrice: null },
          { label: 'B', surfaceSqm: null, askingPrice: 10_000_000, expectedPrice: null },
        ],
      }),
    );
    expect(result.prixSortiePondereParM2).toBe(25_000_000 / 50);
  });

  it('point mort au m2 est null sans surface vendable connue', () => {
    const result = computePrequalFinancials(input({ lots: [{ label: 'A', surfaceSqm: null, askingPrice: 1, expectedPrice: null }] }));
    expect(result.pointMortAuM2).toBeNull();
  });

  it('ratios LTA/LTC/LTV sont null sans montant recherché', () => {
    const result = computePrequalFinancials(input({ amountRequested: null }));
    expect(result.ltaPct).toBeNull();
    expect(result.ltcPct).toBeNull();
    expect(result.ltvPct).toBeNull();
  });

  it('ratios LTA/LTC/LTV se calculent quand toutes les données sont connues', () => {
    const result = computePrequalFinancials(input());
    expect(result.ltaPct).toBe(Math.round((40_000_000 / 30_000_000) * 1000) / 10);
    expect(result.ltcPct).toBe(Math.round((40_000_000 / 50_000_000) * 1000) / 10);
    expect(result.ltvPct).toBe(Math.round((40_000_000 / 54_000_000) * 1000) / 10);
  });

  it("inclut la dette bancaire dans les ratios uniquement si includeBankDebtInRatios est vrai", () => {
    const without = computePrequalFinancials(input({ bankDebt: 5_000_000, includeBankDebtInRatios: false }));
    const withDebt = computePrequalFinancials(input({ bankDebt: 5_000_000, includeBankDebtInRatios: true }));
    expect(without.ltcPct).not.toBe(withDebt.ltcPct);
    expect(withDebt.ltcPct).toBe(Math.round(((40_000_000 + 5_000_000) / 50_000_000) * 1000) / 10);
  });
});
