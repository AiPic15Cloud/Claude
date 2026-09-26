import { computeICRecommendation, type ICRecommendationInput } from './ic-engine.util';

function makeBaseInput(overrides: Partial<ICRecommendationInput> = {}): ICRecommendationInput {
  return {
    sourcesUsesBalanced: true,
    hasPlatformProfile: true,
    hasLeases: true,
    leaseAssessments: [],
    eligibility: { verdict: 'ELIGIBLE', hurdlePct: 6.5, securedNetYieldPct: 7, gapPct: 0.5, notEvaluableReason: null },
    ...overrides,
  };
}

describe('computeICRecommendation — capexDataMissing (Data Integrity, spec V2 §10 "Unknown ≠ Zero")', () => {
  it("n'ajoute aucun watch item quand le CAPEX est renseigné (ou explicitement absent)", () => {
    const result = computeICRecommendation(makeBaseInput({ capexDataMissing: false }));
    expect(result.watchItems.some((w) => w.includes('CAPEX'))).toBe(false);
  });

  it('signale la donnée manquante en watch item, jamais en hard stop (missing data ≠ hard stop)', () => {
    const result = computeICRecommendation(makeBaseInput({ capexDataMissing: true }));
    expect(result.watchItems.some((w) => w.includes('CAPEX non renseigné'))).toBe(true);
    expect(result.hardStops).toHaveLength(0);
  });

  it('un CAPEX manquant seul ne bloque pas une recommandation APPROVE par ailleurs saine', () => {
    const result = computeICRecommendation(makeBaseInput({ capexDataMissing: true }));
    expect(result.status).toBe('APPROVE');
  });
});

describe('computeICRecommendation — ecart CAPEX ESG vs budgete (spec §12/§28)', () => {
  it("n'ajoute aucun watch item quand esgCapexToComplyTotal est absent (pas de classe DPE connue)", () => {
    const result = computeICRecommendation(makeBaseInput({ esgCapexToComplyTotal: null }));
    expect(result.watchItems.some((w) => w.includes('mise en conformité ESG'))).toBe(false);
  });

  it("n'ajoute aucun watch item quand le CAPEX budgete couvre deja le CAPEX de mise en conformite ESG", () => {
    const result = computeICRecommendation(makeBaseInput({ esgCapexToComplyTotal: 20000, budgetedCapexTotal: 25000 }));
    expect(result.watchItems.some((w) => w.includes('mise en conformité ESG'))).toBe(false);
  });

  it('signale un ecart en watch item (jamais un hard stop) quand le CAPEX ESG depasse le CAPEX budgete', () => {
    const result = computeICRecommendation(makeBaseInput({ esgCapexToComplyTotal: 50000, budgetedCapexTotal: 10000 }));
    const item = result.watchItems.find((w) => w.includes('mise en conformité ESG'));
    expect(item).toBeDefined();
    expect(item).toContain('50');
    expect(item).toContain('40'); // ecart = 50000 - 10000
    expect(result.hardStops).toHaveLength(0);
  });

  it('traite un CAPEX budgete absent comme 0, jamais comme "deja couvert"', () => {
    const result = computeICRecommendation(makeBaseInput({ esgCapexToComplyTotal: 30000 }));
    expect(result.watchItems.some((w) => w.includes('mise en conformité ESG'))).toBe(true);
  });
});

describe('computeICRecommendation — eligibility NOT_EVALUABLE (collecte non renseignée, doctrine "Unknown ≠ Zero")', () => {
  it('renvoie HOLD, jamais DECLINE, quand le rendement sécurisé est non évaluable', () => {
    const result = computeICRecommendation(
      makeBaseInput({ eligibility: { verdict: 'NOT_EVALUABLE', hurdlePct: 6.5, securedNetYieldPct: null, gapPct: null, notEvaluableReason: 'NO_COLLECTE' } }),
    );
    expect(result.status).toBe('HOLD');
    expect(result.hardStops).toHaveLength(0);
  });

  it('reste DECLINE quand le rendement est réellement sous le hurdle (INELIGIBLE, pas NOT_EVALUABLE)', () => {
    const result = computeICRecommendation(
      makeBaseInput({ eligibility: { verdict: 'INELIGIBLE', hurdlePct: 6.5, securedNetYieldPct: 2, gapPct: -4.5, notEvaluableReason: null } }),
    );
    expect(result.status).toBe('DECLINE');
  });
});

describe('computeICRecommendation — eligibility NOT_EVALUABLE/NO_PLATFORM_PROFILE (spec Cockpit/Fractionné P0, "hurdle 0% fabriqué")', () => {
  it("renvoie HOLD avec un message distinct de l'absence de collecte, jamais DECLINE, quand aucun profil plateforme n'est rattaché", () => {
    const result = computeICRecommendation(
      makeBaseInput({
        hasPlatformProfile: false,
        eligibility: { verdict: 'NOT_EVALUABLE', hurdlePct: null, securedNetYieldPct: 7, gapPct: null, notEvaluableReason: 'NO_PLATFORM_PROFILE' },
      }),
    );
    expect(result.status).toBe('HOLD');
    expect(result.hardStops).toHaveLength(0);
    expect(result.recommendation).toContain('profil plateforme');
  });
});

describe('computeICRecommendation — feeDataMissing (spec §29.3/§26.31 "le moteur ne valide pas un hurdle net si des frais obligatoires sont inconnus")', () => {
  it("n'ajoute aucun watch item quand des frais stakeholder sont renseignes", () => {
    const result = computeICRecommendation(makeBaseInput({ feeDataMissing: false }));
    expect(result.watchItems.some((w) => w.includes('frais stakeholder'))).toBe(false);
  });

  it('signale en watch item (jamais un hard stop) l\'absence totale de frais stakeholder', () => {
    const result = computeICRecommendation(makeBaseInput({ feeDataMissing: true }));
    expect(result.watchItems.some((w) => w.includes('Aucun frais stakeholder renseigné'))).toBe(true);
    expect(result.hardStops).toHaveLength(0);
  });

  it('des frais stakeholder manquants seuls ne bloquent pas une recommandation APPROVE par ailleurs saine', () => {
    const result = computeICRecommendation(makeBaseInput({ feeDataMissing: true }));
    expect(result.status).toBe('APPROVE');
  });
});
