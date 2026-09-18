import { computePrequalStressTests, type PrequalStressTestInput } from './prequal-stress-test.util';

function input(overrides: Partial<PrequalStressTestInput> = {}): PrequalStressTestInput {
  return {
    foncierTotal: 200_000,
    travauxTotal: 100_000,
    honorairesTechniquesTotal: 0,
    autresFraisScalaires: 0,
    chiffreAffaires: 500_000,
    otherRevenueRetained: null,
    amountRequested: 300_000,
    landPrice: 200_000,
    interestRatePct: 10,
    latePenaltyApplied: false,
    durationTargetMonths: 12,
    feesTTC: 0,
    guaranteeFeesEstimate: 0,
    bankEnabled: false,
    bankLoanTotal: 0,
    bankInterestRatePct: null,
    bankFixedFees: 0,
    lots: [{ label: 'Lot A', surfaceSqm: 100, price: 500_000, status: 'DEED' }],
    medianPricePerSqm: null,
    acquisitionStatus: null,
    ...overrides,
  };
}

function scenario(scenarios: ReturnType<typeof computePrequalStressTests>, key: string) {
  const found = scenarios.find((s) => s.key === key);
  if (!found) throw new Error(`scenario ${key} not found`);
  return found;
}

describe('computePrequalStressTests', () => {
  it('produit les 9 familles de scénarios standards de la spec §11 (14 scénarios : 3 baisses de prix + 2 hausses de travaux + 3 retards)', () => {
    const scenarios = computePrequalStressTests(input());
    expect(scenarios).toHaveLength(14);
  });

  it('baisse des prix de 15% réduit le CA et donc la marge, sans toucher au coût de revient', () => {
    const scenarios = computePrequalStressTests(input());
    // CA = 500000*0.85 = 425000, coût = 200000+100000+0+30000(intérêts 300000*10%*12/12) = 330000
    expect(scenario(scenarios, 'baisse_prix_15').margeEuros).toBe(95_000);
  });

  it('hausse des travaux de 20% augmente le coût de revient sans toucher au CA', () => {
    const scenarios = computePrequalStressTests(input());
    // travaux = 120000, coût = 200000+120000+0+30000 = 350000, CA=500000
    expect(scenario(scenarios, 'hausse_travaux_20').margeEuros).toBe(150_000);
  });

  it('un retard allonge la durée effective et augmente les intérêts, donc réduit la marge', () => {
    const scenarios = computePrequalStressTests(input());
    // durée 24 mois -> intérêts 300000*10%*24/12=60000, coût=200000+100000+0+60000=360000
    expect(scenario(scenarios, 'retard_12').margeEuros).toBe(140_000);
    expect(scenario(scenarios, 'retard_3').margeEuros!).toBeGreaterThan(scenario(scenarios, 'retard_12').margeEuros!);
  });

  it('le scénario combiné est plus défavorable que chaque scénario isolé', () => {
    const scenarios = computePrequalStressTests(input());
    const combi = scenario(scenarios, 'combinaison').margeEuros!;
    expect(combi).toBe(45_000);
    expect(combi).toBeLessThan(scenario(scenarios, 'baisse_prix_15').margeEuros!);
    expect(combi).toBeLessThan(scenario(scenarios, 'hausse_travaux_20').margeEuros!);
  });

  it("absence de revenus locatifs est non applicable si aucun revenu n'est retenu", () => {
    const scenarios = computePrequalStressTests(input({ otherRevenueRetained: null }));
    expect(scenario(scenarios, 'absence_revenus_locatifs').applicable).toBe(false);
  });

  it('absence de revenus locatifs retire exactement le produit retenu du calcul', () => {
    const scenarios = computePrequalStressTests(input({ otherRevenueRetained: 20_000 }));
    const s = scenario(scenarios, 'absence_revenus_locatifs');
    expect(s.applicable).toBe(true);
    // CA=500000, coût=330000, otherRevenue retiré -> marge = 170000 (pas 190000)
    expect(s.margeEuros).toBe(170_000);
  });

  it('vente du lot principal à la médiane est non applicable sans médiane de marché', () => {
    const scenarios = computePrequalStressTests(input({ medianPricePerSqm: null }));
    expect(scenario(scenarios, 'vente_lot_principal_mediane').applicable).toBe(false);
  });

  it('vente du lot principal à la médiane recalcule le CA avec le lot le plus cher au prix médian', () => {
    const scenarios = computePrequalStressTests(input({ medianPricePerSqm: 4000 }));
    // lot 100m² -> 400000 au lieu de 500000, coût inchangé = 330000
    const s = scenario(scenarios, 'vente_lot_principal_mediane');
    expect(s.applicable).toBe(true);
    expect(s.margeEuros).toBe(70_000);
  });

  it('non-réalisation de précommercialisation est sans objet si tous les lots sont déjà engagés', () => {
    const scenarios = computePrequalStressTests(input());
    expect(scenario(scenarios, 'non_realisation_precommercialisation').applicable).toBe(false);
  });

  it('non-réalisation de précommercialisation retire le CA des lots non encore engagés', () => {
    const scenarios = computePrequalStressTests(
      input({
        chiffreAffaires: 800_000,
        lots: [
          { label: 'Lot A', surfaceSqm: 100, price: 500_000, status: 'DEED' },
          { label: 'Lot B', surfaceSqm: 50, price: 300_000, status: 'NOT_MARKETED' },
        ],
      }),
    );
    const s = scenario(scenarios, 'non_realisation_precommercialisation');
    expect(s.applicable).toBe(true);
    // CA ajusté = 800000-300000 = 500000, coût=330000 -> marge=170000
    expect(s.margeEuros).toBe(170_000);
  });

  it('acquisition conditionnelle impossible est qualitatif (jamais une marge inventée), non applicable hors situation conditionnelle', () => {
    const notConditional = computePrequalStressTests(input({ acquisitionStatus: 'PROPRIETE' }));
    expect(scenario(notConditional, 'acquisition_conditionnelle_impossible').applicable).toBe(false);

    const conditional = computePrequalStressTests(input({ acquisitionStatus: 'PROMESSE' }));
    const s = scenario(conditional, 'acquisition_conditionnelle_impossible');
    expect(s.applicable).toBe(true);
    expect(s.margeEuros).toBeNull();
    expect(s.capaciteRemboursement).toBe('NON_QUANTIFIABLE');
  });

  it('capacité de remboursement est INSUFFISANTE si la marge est négative', () => {
    const scenarios = computePrequalStressTests(input({ chiffreAffaires: 100_000 }));
    expect(scenario(scenarios, 'baisse_prix_15').capaciteRemboursement).toBe('INSUFFISANTE');
  });
});
