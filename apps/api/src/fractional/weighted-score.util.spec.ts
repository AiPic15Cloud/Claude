import { computeWeightedScore, computeScoreTierVerdict, computeFitAssessment, type ScoreCategoryInput } from './weighted-score.util';
import type { EliminatoryMetricsInput, EliminatoryRuleInput } from './eliminatory-rule.util';

const categories: ScoreCategoryInput[] = [
  {
    id: 'cat-exploitant',
    label: 'Exploitant',
    maxPoints: 20,
    criteria: [
      {
        id: 'crit-anciennete',
        label: 'Ancienneté de l\'exploitant',
        buckets: [
          { id: 'b-lt2', points: 4 },
          { id: 'b-gt5', points: 20 },
        ],
      },
    ],
  },
  {
    id: 'cat-locatif',
    label: 'État locatif',
    maxPoints: 15,
    criteria: [
      {
        id: 'crit-walb',
        label: 'WALB',
        buckets: [
          { id: 'b-court', points: 3 },
          { id: 'b-long', points: 15 },
        ],
      },
    ],
  },
];

describe('computeWeightedScore', () => {
  it('somme les points par catégorie et au total', () => {
    const result = computeWeightedScore(categories, [
      { criterionId: 'crit-anciennete', bucketId: 'b-gt5' },
      { criterionId: 'crit-walb', bucketId: 'b-court' },
    ]);
    expect(result.categoryBreakdown).toEqual([
      { categoryId: 'cat-exploitant', label: 'Exploitant', points: 20, maxPoints: 20, pct: 100 },
      { categoryId: 'cat-locatif', label: 'État locatif', points: 3, maxPoints: 15, pct: 20 },
    ]);
    expect(result.totalPoints).toBe(23);
    expect(result.maxPoints).toBe(35);
    expect(result.pct).toBeCloseTo((23 / 35) * 100, 6);
  });

  it('un critère sans réponse est signalé dans unansweredCriterionIds, jamais scoré à 0 silencieusement', () => {
    const result = computeWeightedScore(categories, [{ criterionId: 'crit-anciennete', bucketId: 'b-gt5' }]);
    expect(result.unansweredCriterionIds).toEqual(['crit-walb']);
    expect(result.totalPoints).toBe(20);
  });

  it('un bucketId qui ne correspond à aucun bucket du critère est traité comme non répondu', () => {
    const result = computeWeightedScore(categories, [{ criterionId: 'crit-anciennete', bucketId: 'inexistant' }]);
    expect(result.unansweredCriterionIds).toContain('crit-anciennete');
  });

  it('aucune catégorie -> totaux nuls, pct à 0 (pas de division par zéro)', () => {
    const result = computeWeightedScore([], []);
    expect(result).toEqual({ totalPoints: 0, maxPoints: 0, pct: 0, categoryBreakdown: [], unansweredCriterionIds: [] });
  });
});

describe('computeScoreTierVerdict', () => {
  it.each([
    [39.9, 'NO_GO'],
    [40, 'CONDITIONNEL'],
    [59.9, 'CONDITIONNEL'],
    [60, 'GO'],
    [79.9, 'GO'],
    [80, 'GO_FORT'],
    [100, 'GO_FORT'],
  ] as const)('%d%% -> %s', (pct, expected) => {
    expect(computeScoreTierVerdict(pct)).toBe(expected);
  });
});

describe('computeFitAssessment — réconciliation score/règles éliminatoires (Complément H, H.5)', () => {
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
  const failingRule: EliminatoryRuleInput = {
    id: 'r1',
    label: 'Rendement net sécurisé',
    metricKey: 'SECURED_NET_YIELD_PCT',
    operator: 'GTE',
    threshold: 6.5,
    failMessage: 'Rendement net sécurisé sous le seuil Tantiem (6,5 %).',
  };
  const passingRule: EliminatoryRuleInput = { ...failingRule, id: 'r2', threshold: 5 };

  it('un score élevé (GO_FORT) est supplanté en NO_GO par une règle éliminatoire en échec — jamais l\'inverse', () => {
    const answers = [
      { criterionId: 'crit-anciennete', bucketId: 'b-gt5' },
      { criterionId: 'crit-walb', bucketId: 'b-long' },
    ];
    const result = computeFitAssessment(categories, answers, [failingRule], metrics);
    expect(result.scoreVerdict).toBe('GO_FORT');
    expect(result.finalVerdict).toBe('NO_GO');
    expect(result.supplantedByEliminatoryRule).toBe(true);
    expect(result.eliminatoryResults[0].passed).toBe(false);
  });

  it('sans règle en échec, le verdict final suit simplement le score', () => {
    const answers = [
      { criterionId: 'crit-anciennete', bucketId: 'b-gt5' },
      { criterionId: 'crit-walb', bucketId: 'b-long' },
    ];
    const result = computeFitAssessment(categories, answers, [passingRule], metrics);
    expect(result.finalVerdict).toBe('GO_FORT');
    expect(result.supplantedByEliminatoryRule).toBe(false);
  });

  it('aucune règle éliminatoire configurée -> jamais de faux NO_GO, le score prévaut', () => {
    const result = computeFitAssessment(categories, [], [], metrics);
    expect(result.eliminatoryResults).toEqual([]);
    expect(result.finalVerdict).toBe(result.scoreVerdict);
  });
});
