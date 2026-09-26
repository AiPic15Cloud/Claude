import { evaluateEliminatoryRules, type EliminatoryMetricsInput, type EliminatoryRuleInput } from './eliminatory-rule.util';

const metrics: EliminatoryMetricsInput = {
  securedNetYieldPct: 5.8,
  investorNetYieldPct: 6.2,
  grossYieldPct: 8.55,
  walbYears: 2.5,
  waltYears: 9.4,
  irrPct: 7.1,
  equityMultiple: 1.4,
  sourcesUsesBalanced: true,
};

function rule(overrides: Partial<EliminatoryRuleInput> = {}): EliminatoryRuleInput {
  return {
    id: 'r1',
    label: 'Rendement net sécurisé',
    metricKey: 'SECURED_NET_YIELD_PCT',
    operator: 'GTE',
    threshold: 6.5,
    failMessage: 'Rendement net sécurisé sous le seuil Tantiem (6,5 %).',
    ...overrides,
  };
}

describe('evaluateEliminatoryRules', () => {
  it('marque non conforme et renvoie failMessage quand le seuil GTE n\'est pas atteint', () => {
    const [result] = evaluateEliminatoryRules([rule()], metrics);
    expect(result.passed).toBe(false);
    expect(result.observedValue).toBe(5.8);
    expect(result.failMessage).toBe('Rendement net sécurisé sous le seuil Tantiem (6,5 %).');
  });

  it('marque conforme quand le seuil est atteint, failMessage null', () => {
    const [result] = evaluateEliminatoryRules([rule({ threshold: 5 })], metrics);
    expect(result.passed).toBe(true);
    expect(result.failMessage).toBeNull();
  });

  it.each([
    ['GTE', 5.8, true],
    ['GTE', 5.9, false],
    ['LTE', 5.8, true],
    ['LTE', 5.7, false],
    ['GT', 5.7, true],
    ['GT', 5.8, false],
    ['LT', 5.9, true],
    ['LT', 5.8, false],
    ['EQ', 5.8, true],
    ['EQ', 5.9, false],
  ] as const)('opérateur %s avec seuil %d -> passed=%s', (operator, threshold, expected) => {
    const [result] = evaluateEliminatoryRules([rule({ operator, threshold })], metrics);
    expect(result.passed).toBe(expected);
  });

  it('une métrique indisponible (null) est non conforme avec un message distinct de failMessage — donnée manquante ≠ risque avéré', () => {
    const [result] = evaluateEliminatoryRules([rule({ metricKey: 'WALB_YEARS', threshold: 3 })], { ...metrics, walbYears: null });
    expect(result.passed).toBe(false);
    expect(result.observedValue).toBeNull();
    expect(result.failMessage).not.toBe('Rendement net sécurisé sous le seuil Tantiem (6,5 %).');
    expect(result.failMessage).toMatch(/indisponible/);
  });

  it('marque unverifiable=true seulement quand la métrique est absente — jamais sur une règle réellement en échec (spec Cockpit/Fractionné §5.4)', () => {
    const [unverifiable] = evaluateEliminatoryRules([rule({ metricKey: 'WALB_YEARS', threshold: 3 })], { ...metrics, walbYears: null });
    expect(unverifiable.unverifiable).toBe(true);
    const [genuinelyFailed] = evaluateEliminatoryRules([rule()], metrics);
    expect(genuinelyFailed.passed).toBe(false);
    expect(genuinelyFailed.unverifiable).toBe(false);
    const [genuinelyPassed] = evaluateEliminatoryRules([rule({ threshold: 5 })], metrics);
    expect(genuinelyPassed.unverifiable).toBe(false);
  });

  it('SOURCES_USES_BALANCED se lit comme 1 (équilibré) ou 0 (déséquilibré)', () => {
    const [balanced] = evaluateEliminatoryRules([rule({ metricKey: 'SOURCES_USES_BALANCED', operator: 'EQ', threshold: 1 })], metrics);
    expect(balanced.passed).toBe(true);
    const [unbalanced] = evaluateEliminatoryRules(
      [rule({ metricKey: 'SOURCES_USES_BALANCED', operator: 'EQ', threshold: 1 })],
      { ...metrics, sourcesUsesBalanced: false },
    );
    expect(unbalanced.passed).toBe(false);
  });

  it('évalue plusieurs règles indépendamment', () => {
    const results = evaluateEliminatoryRules(
      [rule({ id: 'r1', threshold: 5 }), rule({ id: 'r2', metricKey: 'GROSS_YIELD_PCT', operator: 'GTE', threshold: 20 })],
      metrics,
    );
    expect(results.map((r) => r.passed)).toEqual([true, false]);
  });
});
