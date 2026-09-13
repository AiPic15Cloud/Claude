import { computeICRecommendation, type ICRecommendationInput } from './ic-engine.util';

function makeBaseInput(overrides: Partial<ICRecommendationInput> = {}): ICRecommendationInput {
  return {
    sourcesUsesBalanced: true,
    hasPlatformProfile: true,
    hasLeases: true,
    leaseAssessments: [],
    eligibility: { verdict: 'ELIGIBLE', hurdlePct: 6.5, securedNetYieldPct: 7, gapPct: 0.5 },
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
