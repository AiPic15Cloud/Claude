import { computeEligibility } from './eligibility.util';

describe('computeEligibility — collecte non renseignée (doctrine "Unknown ≠ Zero")', () => {
  it('renvoie NOT_EVALUABLE (jamais INELIGIBLE) quand securedNetYieldPct est null', () => {
    const result = computeEligibility(null, 6.5);
    expect(result.verdict).toBe('NOT_EVALUABLE');
    expect(result.notEvaluableReason).toBe('NO_COLLECTE');
    expect(result.securedNetYieldPct).toBeNull();
    expect(result.gapPct).toBeNull();
  });

  it('un 0% réel (et non un null) reste correctement classé INELIGIBLE', () => {
    const result = computeEligibility(0, 6.5);
    expect(result.verdict).toBe('INELIGIBLE');
  });
});

describe('computeEligibility — aucun profil plateforme rattaché (spec Cockpit/Fractionné P0, "hurdle 0% fabriqué")', () => {
  it('renvoie NOT_EVALUABLE avec notEvaluableReason=NO_PLATFORM_PROFILE quand hurdlePct est null, jamais INELIGIBLE sur un hurdle fabriqué à 0', () => {
    const result = computeEligibility(8, null);
    expect(result.verdict).toBe('NOT_EVALUABLE');
    expect(result.notEvaluableReason).toBe('NO_PLATFORM_PROFILE');
    expect(result.hurdlePct).toBeNull();
  });

  it('reste NOT_EVALUABLE/NO_PLATFORM_PROFILE même si le rendement observé est très faible — un hurdle absent ne doit jamais se travestir en 0% et produire un faux INELIGIBLE', () => {
    const result = computeEligibility(0.1, null);
    expect(result.verdict).toBe('NOT_EVALUABLE');
    expect(result.notEvaluableReason).toBe('NO_PLATFORM_PROFILE');
  });

  it('priorise NO_PLATFORM_PROFILE sur NO_COLLECTE quand les deux données manquent à la fois', () => {
    const result = computeEligibility(null, null);
    expect(result.verdict).toBe('NOT_EVALUABLE');
    expect(result.notEvaluableReason).toBe('NO_PLATFORM_PROFILE');
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
