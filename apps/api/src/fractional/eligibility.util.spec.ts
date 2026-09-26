import { computeEligibility } from './eligibility.util';

describe('computeEligibility — collecte non renseignée (doctrine "Unknown ≠ Zero")', () => {
  it('renvoie NOT_EVALUABLE (jamais INELIGIBLE) quand securedNetYieldPct est null', () => {
    const result = computeEligibility(null, 6.5);
    expect(result.verdict).toBe('NOT_EVALUABLE');
    expect(result.securedNetYieldPct).toBeNull();
    expect(result.gapPct).toBeNull();
  });

  it('un 0% réel (et non un null) reste correctement classé INELIGIBLE', () => {
    const result = computeEligibility(0, 6.5);
    expect(result.verdict).toBe('INELIGIBLE');
  });
});

describe('computeEligibility — verdicts standards', () => {
  it('ELIGIBLE quand le rendement dépasse le hurdle de plus de la bande marginale', () => {
    expect(computeEligibility(8, 6.5).verdict).toBe('ELIGIBLE');
  });

  it('MARGINAL dans la bande de ±0.5pt autour du hurdle', () => {
    expect(computeEligibility(6.5, 6.5).verdict).toBe('MARGINAL');
  });

  it('INELIGIBLE sous la bande marginale', () => {
    expect(computeEligibility(5, 6.5).verdict).toBe('INELIGIBLE');
  });
});
