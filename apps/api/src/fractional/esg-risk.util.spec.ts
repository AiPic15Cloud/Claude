import { computeEsgRiskProfile, dpeClassGap, type EsgRiskInput } from './esg-risk.util';

const BASE_INPUT: EsgRiskInput = {
  dpeClass: null,
  consumptionKwhM2An: null,
  decreeTertiaireSubject: false,
  equipmentConditionTier: null,
  physicalRiskExposure: null,
  greenLeaseClauses: false,
};

describe('computeEsgRiskProfile', () => {
  it('never estimates a CAPEX amount without a known DPE class (no silently guessed cost)', () => {
    const result = computeEsgRiskProfile(BASE_INPUT, 1000);

    expect(result.dpeClassKnown).toBe(false);
    expect(result.capexToComplyPerM2).toBeNull();
    expect(result.capexToComplyTotal).toBeNull();
    expect(result.capexToCompetePerM2).toBeNull();
    expect(result.capexToCompeteTotal).toBeNull();
  });

  it('treats an unevaluated dimension as the worst case for risk premiums, never a silent zero', () => {
    const result = computeEsgRiskProfile(BASE_INPUT, 1000);

    // Worst case: G (1.5pts) + OBSOLETE (0.75pts) + ELEVE (0.75pts) = 3pts
    expect(result.strandedAssetPremiumPct).toBe(1.5);
    expect(result.equipmentObsolescencePremiumPct).toBe(0.75);
    expect(result.physicalRiskPremiumPct).toBe(0.75);
    expect(result.totalValuationImpactPts).toBe(3);
  });

  it('a class A/B/C asset not subject to the decree tertiaire needs no compliance CAPEX', () => {
    const result = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'B', decreeTertiaireSubject: false }, 1000);

    expect(result.capexToComplyPerM2).toBe(0);
    expect(result.capexToComplyTotal).toBe(0);
    expect(result.strandedAssetPremiumPct).toBe(0);
  });

  it('computes compliance CAPEX only when subject to the decree tertiaire and below class C', () => {
    const result = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'F', decreeTertiaireSubject: true }, 500);

    expect(result.capexToComplyPerM2).toBe(160);
    expect(result.capexToComplyTotal).toBe(80_000);
  });

  it('does not charge compliance CAPEX when a poor DPE class is not subject to the decree tertiaire', () => {
    const result = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'F', decreeTertiaireSubject: false }, 500);

    expect(result.capexToComplyPerM2).toBe(0);
    expect(result.capexToComplyTotal).toBe(0);
    // Competitiveness CAPEX is independent of decree subjection.
    expect(result.capexToCompetePerM2).toBe(220);
    expect(result.capexToCompeteTotal).toBe(110_000);
  });

  it('returns null CAPEX totals when surface is unknown, even with a known DPE class', () => {
    const result = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'F', decreeTertiaireSubject: true }, null);

    expect(result.capexToComplyPerM2).toBe(160);
    expect(result.capexToComplyTotal).toBeNull();
  });

  it('applies the full stranded-asset premium for class G, none for class A-D', () => {
    const g = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'G' }, 1000);
    const d = computeEsgRiskProfile({ ...BASE_INPUT, dpeClass: 'D' }, 1000);

    expect(g.strandedAssetPremiumPct).toBe(1.5);
    expect(d.strandedAssetPremiumPct).toBe(0);
  });

  it('sums all three premium lines into totalValuationImpactPts, decomposed and never opaque', () => {
    const result = computeEsgRiskProfile(
      { ...BASE_INPUT, dpeClass: 'E', equipmentConditionTier: 'VETUSTE', physicalRiskExposure: 'MODERE' },
      1000,
    );

    expect(result.strandedAssetPremiumPct).toBe(0.25);
    expect(result.equipmentObsolescencePremiumPct).toBe(0.25);
    expect(result.physicalRiskPremiumPct).toBe(0.25);
    expect(result.totalValuationImpactPts).toBe(0.75);
  });
});

describe('dpeClassGap', () => {
  it('returns a positive gap when current class is worse than target', () => {
    expect(dpeClassGap('F', 'C')).toBe(3);
  });

  it('returns zero when current class equals target', () => {
    expect(dpeClassGap('C', 'C')).toBe(0);
  });

  it('returns a negative gap when current class is better than target', () => {
    expect(dpeClassGap('A', 'C')).toBe(-2);
  });
});
