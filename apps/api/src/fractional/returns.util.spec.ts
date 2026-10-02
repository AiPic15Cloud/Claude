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
      ervAnnuel: null,
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

describe('computeReturnsEngine — breakScenario (Break Event Engine, spec V2 §9)', () => {
  // Cas "Action Saint-Étienne" : hold period 8 ans, break à 2,5 ans (WALB
  // court), reproduit la contradiction signalée — WALB 2,5 ans affiché mais
  // cash-flow qui continuait tout droit sur 8 ans sans rupture ni CAPEX.
  const actionLikeInput = makeBaseInput(
    { holdPeriodYears: 8 },
    { loyerFacialAnnuel: 124617, dateTerme: new Date('2040-01-01'), breakDates: [new Date('2028-07-01')] },
  );

  it("BASE reste identique a l'ancien comportement (aucun break modelise) : loyer plein sur les 8 annees", () => {
    const result = computeReturnsEngine(actionLikeInput);
    expect(result.breakScenario).toBe('BASE');
    for (const y of result.yearlyModel) {
      expect(y.grossPotentialRent).toBeCloseTo(124617 * Math.pow(1.015, y.year - 1), 4);
      expect(y.capex).toBe(0);
    }
  });

  it('DOWNSIDE fait apparaitre une rupture reelle a l\'echeance du break : NOI en baisse et CAPEX de relocation, plus IRR degrade vs BASE', () => {
    const base = computeReturnsEngine(actionLikeInput);
    const downside = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'DOWNSIDE' });

    // L'annee du break (annee 3) porte desormais un CAPEX de relocation — absent en BASE.
    const breakYearDownside = downside.yearlyModel[2];
    expect(breakYearDownside.capex).toBeGreaterThan(0);
    expect(breakYearDownside.grossPotentialRent).toBeLessThan(base.yearlyModel[2].grossPotentialRent);

    // Le TRI degrade reflete la perte de revenu + le CAPEX, pas seulement le loyer facial.
    expect(downside.irrPct).not.toBeNull();
    expect(base.irrPct).not.toBeNull();
    expect(downside.irrPct as number).toBeLessThan(base.irrPct as number);
  });

  it('SEVERE degrade davantage que DOWNSIDE (vacance plus longue + decote plus forte + CAPEX plus eleve)', () => {
    const downside = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'DOWNSIDE' });
    const severe = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'SEVERE' });
    expect(severe.irrPct as number).toBeLessThan(downside.irrPct as number);
    expect(severe.yearlyModel[2].capex).toBeGreaterThan(downside.yearlyModel[2].capex);
  });
});

describe('computeReturnsEngine — TVA (Complément H, H.3)', () => {
  it("MARGE/NON_ASSUJETTI ne changent rien au TRI — pas d'événement de trésorerie", () => {
    const base = computeReturnsEngine(makeBaseInput());
    const marge = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'MARGE', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(marge.irrPct).toBeCloseTo(base.irrPct as number, 6);
    expect(marge.irrImpactFromTvaTimingPts).toBeNull();
  });

  it('PRIX_TOTAL_OPTION_LOYERS dégrade le TRI (décaissement à t=0, récupération plus tard) — impact négatif renseigné', () => {
    const base = computeReturnsEngine(makeBaseInput());
    const withTva = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(withTva.irrPct as number).toBeLessThan(base.irrPct as number);
    expect(withTva.irrImpactFromTvaTimingPts).not.toBeNull();
    expect(withTva.irrImpactFromTvaTimingPts as number).toBeLessThan(0);
  });

  it('un délai de récupération plus long dégrade davantage le TRI qu\'un délai court', () => {
    const short = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    const long = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 14 } }));
    expect(long.irrPct as number).toBeLessThan(short.irrPct as number);
  });

  it("le multiple d'equity reste inchangé — le net de TVA est nul à terme, seul le TRI (timing) bouge", () => {
    const base = computeReturnsEngine(makeBaseInput());
    const withTva = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(withTva.equityMultiple).toBeCloseTo(base.equityMultiple as number, 6);
  });
});

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

describe('computeReturnsEngine — Total Return & Yield Dependency (spec §15)', () => {
  it('sans croissance des loyers ni plus-value a la sortie, la performance provient uniquement des loyers', () => {
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 0, exitValue: 1000000 }));
    expect(result.yieldDependency.indexationContributionEur).toBeCloseTo(0, 4);
    expect(result.yieldDependency.resaleContributionEur).toBeCloseTo(0, 4);
    expect(result.yieldDependency.rentSharePct!).toBeCloseTo(100, 4);
    expect(result.capitalReturnPct).toBeCloseTo(0, 6);
    expect(result.totalReturnPct).toBeCloseTo(result.incomeReturnPct!, 6);
  });

  it('la croissance des loyers alimente indexationContributionEur, positif si les loyers augmentent', () => {
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 3, exitValue: 1000000 }));
    expect(result.yieldDependency.indexationContributionEur).toBeGreaterThan(0);
    expect(result.yieldDependency.indexationSharePct!).toBeGreaterThan(0);
  });

  it('une plus-value a la sortie alimente resaleContributionEur et capitalReturnPct, hors retour du capital lui-meme', () => {
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 0, exitValue: 1300000, sellingCostsPct: 0 }));
    // capitalGainShareInvestorPct=100 et sellingCostsPct=0 => tout le gain (300000) revient a l'investisseur
    expect(result.yieldDependency.resaleContributionEur).toBeCloseTo(300000, 4);
    expect(result.capitalReturnPct).toBeCloseTo(30, 4); // 300000 / 1000000 collecte
  });

  it('les trois parts de yieldDependency somment a 100% quand la performance totale est positive', () => {
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 2, exitValue: 1200000 }));
    const sum = result.yieldDependency.rentSharePct! + result.yieldDependency.indexationSharePct! + result.yieldDependency.resaleSharePct!;
    expect(sum).toBeCloseTo(100, 4);
  });

  it('yieldDependency ne fabrique jamais de part en % quand la performance totale n\'est pas positive (Unknown != Zero)', () => {
    // Loyer nul, pas de plus-value : performance totale nulle ou negative.
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 0, exitValue: 1000000 }, { loyerFacialAnnuel: 0 }));
    expect(result.yieldDependency.totalPerformanceEur).toBeLessThanOrEqual(0);
    expect(result.yieldDependency.rentSharePct).toBeNull();
    expect(result.yieldDependency.indexationSharePct).toBeNull();
    expect(result.yieldDependency.resaleSharePct).toBeNull();
  });

  it('totalReturnPct est toujours la somme d\'incomeReturnPct et capitalReturnPct', () => {
    const result = computeReturnsEngine(makeBaseInput({ rentGrowthPctPerYear: 1.5, exitValue: 1100000 }));
    expect(result.totalReturnPct).toBeCloseTo(result.incomeReturnPct! + result.capitalReturnPct!, 8);
  });

  it('collecteMontant a 0 renvoie null sur les rendements/parts investisseur (Unknown != Zero), jamais 0%', () => {
    const result = computeReturnsEngine(makeBaseInput({ sourcesUses: { ...makeBaseInput().sourcesUses, collecteMontant: 0 } }));
    expect(result.securedNetYieldPct).toBeNull();
    expect(result.investorNetYieldPct).toBeNull();
    expect(result.incomeReturnPct).toBeNull();
    expect(result.capitalReturnPct).toBeNull();
    expect(result.totalReturnPct).toBeNull();
  });
});

describe('computeReturnsEngine — fiscalité du véhicule (tax-engine.util.ts)', () => {
  it('tax est null quand input.tax est absent — comportement avant impôt inchangé', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.tax).toBeNull();
  });

  it('calcule un IS annuel après impôt strictement inférieur à la distribution avant impôt quand le résultat est positif', () => {
    const result = computeReturnsEngine(
      makeBaseInput(
        { opexPct: 0, vacancyCreditLossPct: 0 },
        {},
      ),
    );
    const resultWithTax = computeReturnsEngine(
      makeBaseInput(
        { opexPct: 0, vacancyCreditLossPct: 0, tax: { openingCarryforwardDeficit: 0 } },
        {},
      ),
    );
    expect(resultWithTax.tax).not.toBeNull();
    const year1Tax = resultWithTax.tax!.yearly[0];
    expect(year1Tax.corporateTaxDue).toBeGreaterThan(0);
    expect(year1Tax.investorDistributionAfterTax).toBeLessThan(result.yearlyModel[0].investorDistribution);
    // Le TRI avant impôt (champ existant, inchangé) reste strictement supérieur au TRI après impôt.
    expect(resultWithTax.irrPct).toBe(result.irrPct);
    expect(resultWithTax.tax!.irrPctAfterTax).not.toBeNull();
    expect(resultWithTax.tax!.irrPctAfterTax!).toBeLessThan(resultWithTax.irrPct!);
  });

  it('un déficit reportable suffisant annule l\'IS de l\'année et vient réduire la plus-value imposable à la sortie', () => {
    const result = computeReturnsEngine(
      makeBaseInput({
        opexPct: 0,
        vacancyCreditLossPct: 0,
        exitValue: 1500000,
        tax: { openingCarryforwardDeficit: 10000000 },
      }),
    );
    expect(result.tax!.yearly.every((y) => y.corporateTaxDue === 0)).toBe(true);
    expect(result.tax!.exit.capitalGainTaxDue).toBe(0);
    expect(result.tax!.finalCarryforwardDeficit).toBeGreaterThan(0);
  });

  it('le complément de droits art. 1115 ne se déclenche que si la détention dépasse l\'engagement de revente', () => {
    const withinCommitment = computeReturnsEngine(
      makeBaseInput({
        holdPeriodYears: 5,
        tax: { resale1115: { dutyBase: 1000000, resaleCommitmentMonths: 60 } },
      }),
    );
    expect(withinCommitment.tax!.exit.resale1115?.commitmentBreached).toBe(false);

    const beyondCommitment = computeReturnsEngine(
      makeBaseInput({
        holdPeriodYears: 6,
        tax: { resale1115: { dutyBase: 1000000, resaleCommitmentMonths: 60 } },
      }),
    );
    expect(beyondCommitment.tax!.exit.resale1115?.commitmentBreached).toBe(true);
    expect(beyondCommitment.tax!.exit.resale1115!.totalDue).toBeGreaterThan(0);
  });
});
