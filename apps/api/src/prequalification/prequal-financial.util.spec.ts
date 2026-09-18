import { computePrequalFinancials, type PrequalFinancialInput } from './prequal-financial.util';

function input(overrides: Partial<PrequalFinancialInput> = {}): PrequalFinancialInput {
  return {
    travauxItems: [{ category: 'TRAVAUX', label: 'Gros œuvre', amount: 20_000_000 }],
    honorairesTechniquesItems: [],
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
    notaryFees: null,
    diagnosticsCost: null,
    insuranceCost: null,
    propertyTaxCost: null,
    surveyStudiesCost: null,
    agencyFees: null,
    referralFees: null,
    bankMiscFees: null,
    interestRatePct: null,
    durationTargetMonths: null,
    feesPctHT: null,
    tvaApplicable: false,
    tvaRatePct: null,
    latePenaltyApplied: false,
    hypothequeEnvisagee: false,
    bankName: null,
    bankLoanAcquisition: null,
    bankLoanAccompagnement: null,
    bankInterestRatePct: null,
    bankFileFees: null,
    bankGuaranteeFees: null,
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

  it('les ratios "avec banque" incluent le financement bancaire optionnel, jamais les ratios simples', () => {
    const withoutBank = computePrequalFinancials(input());
    const withBank = computePrequalFinancials(input({ bankName: 'Banque X', bankLoanAcquisition: 5_000_000 }));
    expect(withBank.ltcPct).toBe(withoutBank.ltcPct);
    expect(withBank.bank.enabled).toBe(true);
    expect(withBank.bank.loanTotal).toBe(5_000_000);
    expect(withBank.ltcAvecBanquePct).toBe(Math.round(((40_000_000 + 5_000_000) / 50_000_000) * 1000) / 10);
  });

  it('le financement bancaire est désactivé sans nom de banque, même avec un montant saisi', () => {
    const result = computePrequalFinancials(input({ bankLoanAcquisition: 5_000_000 }));
    expect(result.bank.enabled).toBe(false);
    expect(result.bank.loanTotal).toBe(0);
    expect(result.ltcAvecBanquePct).toBe(result.ltcPct);
  });

  it('la décomposition Foncier/Travaux/Honoraires du coût de revient est cohérente avec le total', () => {
    const result = computePrequalFinancials(input());
    expect(result.foncierTotal).toBe(30_000_000);
    expect(result.travauxTotal).toBe(20_000_000);
    expect(result.honorairesTechniquesTotal).toBe(0);
    expect(result.foncierTotal + result.travauxTotal + result.honorairesTechniquesTotal + result.autresFraisScalaires + result.financing.totalFees).toBe(
      result.coutDeRevient,
    );
  });

  it('la sensibilité produit 3 scénarios Pessimiste/Base/Optimiste cohérents avec le scénario central', () => {
    const result = computePrequalFinancials(input());
    expect(result.sensitivity.map((s) => s.label)).toEqual(['Pessimiste', 'Base', 'Optimiste']);
    const base = result.sensitivity[1];
    expect(base.revenue).toBe(result.chiffreAffaires);
    expect(base.totalCost).toBe(result.coutDeRevient);
    expect(base.margin).toBe(result.marge);
  });
});
