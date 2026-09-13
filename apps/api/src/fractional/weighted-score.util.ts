import { evaluateEliminatoryRules, type EliminatoryMetricsInput, type EliminatoryRuleInput, type EliminatoryRuleResult } from './eliminatory-rule.util';

/**
 * Weighted Scoring Engine (Complément H, points 1 et 8 — audit du classeur
 * myVesta x LPB). Barème décomposable jusqu'au dernier point : chaque point
 * se retrace jusqu'à un critère nommé, une réponse choisie dans une liste
 * fermée (bucket) et un barème visible — jamais un score composite opaque.
 *
 * Règle H.5 (corrige un vrai défaut du classeur audité, où le score pondéré
 * et les règles éliminatoires produisaient deux verdicts non hiérarchisés
 * visibles simultanément) : computeFitAssessment réconcilie toujours les
 * deux en UN SEUL verdict final — une règle éliminatoire en échec supplante
 * systématiquement le verdict du score, jamais l'inverse.
 */

export interface ScoreBucketInput {
  id: string;
  points: number;
}

export interface ScoreCriterionInput {
  id: string;
  label: string;
  buckets: ScoreBucketInput[];
}

export interface ScoreCategoryInput {
  id: string;
  label: string;
  maxPoints: number;
  criteria: ScoreCriterionInput[];
}

export interface ScoreAnswerInput {
  criterionId: string;
  bucketId: string;
}

export interface CategoryBreakdown {
  categoryId: string;
  label: string;
  points: number;
  maxPoints: number;
  pct: number;
}

export interface WeightedScoreResult {
  totalPoints: number;
  maxPoints: number;
  pct: number;
  categoryBreakdown: CategoryBreakdown[];
  /** Critères sans réponse — jamais scorés silencieusement à 0, signalés explicitement (cf. doctrine "Unknown ≠ Zero"). */
  unansweredCriterionIds: string[];
}

export function computeWeightedScore(categories: ScoreCategoryInput[], answers: ScoreAnswerInput[]): WeightedScoreResult {
  const bucketIdByCriterion = new Map(answers.map((a) => [a.criterionId, a.bucketId]));
  const unansweredCriterionIds: string[] = [];
  let totalPoints = 0;
  let maxPoints = 0;

  const categoryBreakdown: CategoryBreakdown[] = categories.map((category) => {
    let categoryPoints = 0;
    for (const criterion of category.criteria) {
      const bucketId = bucketIdByCriterion.get(criterion.id);
      const bucket = bucketId !== undefined ? criterion.buckets.find((b) => b.id === bucketId) : undefined;
      if (!bucket) {
        unansweredCriterionIds.push(criterion.id);
        continue;
      }
      categoryPoints += bucket.points;
    }
    totalPoints += categoryPoints;
    maxPoints += category.maxPoints;
    return {
      categoryId: category.id,
      label: category.label,
      points: categoryPoints,
      maxPoints: category.maxPoints,
      pct: category.maxPoints > 0 ? (categoryPoints / category.maxPoints) * 100 : 0,
    };
  });

  return { totalPoints, maxPoints, pct: maxPoints > 0 ? (totalPoints / maxPoints) * 100 : 0, categoryBreakdown, unansweredCriterionIds };
}

/** Échelle par défaut (Complément H, H.5) — paramètres nommés explicites, à calibrer une fois des dossiers réels notés disponibles. */
export const SCORE_TIER_THRESHOLDS_PCT = { NO_GO_BELOW: 40, CONDITIONNEL_BELOW: 60, GO_FORT_AT_OR_ABOVE: 80 };

export type ScoreTierVerdict = 'NO_GO' | 'CONDITIONNEL' | 'GO' | 'GO_FORT';

export function computeScoreTierVerdict(pct: number): ScoreTierVerdict {
  if (pct < SCORE_TIER_THRESHOLDS_PCT.NO_GO_BELOW) return 'NO_GO';
  if (pct < SCORE_TIER_THRESHOLDS_PCT.CONDITIONNEL_BELOW) return 'CONDITIONNEL';
  if (pct < SCORE_TIER_THRESHOLDS_PCT.GO_FORT_AT_OR_ABOVE) return 'GO';
  return 'GO_FORT';
}

export interface FitAssessmentResult {
  score: WeightedScoreResult;
  scoreVerdict: ScoreTierVerdict;
  eliminatoryResults: EliminatoryRuleResult[];
  /** Verdict réconcilié (H.5) — jamais deux verdicts non hiérarchisés affichés côte à côte. */
  finalVerdict: ScoreTierVerdict;
  /** Vrai si au moins une règle éliminatoire a fait basculer finalVerdict en NO_GO alors que le score seul aurait dit autre chose — toujours affiché explicitement (H.5). */
  supplantedByEliminatoryRule: boolean;
}

export function computeFitAssessment(
  categories: ScoreCategoryInput[],
  answers: ScoreAnswerInput[],
  rules: EliminatoryRuleInput[],
  metrics: EliminatoryMetricsInput,
): FitAssessmentResult {
  const score = computeWeightedScore(categories, answers);
  const scoreVerdict = computeScoreTierVerdict(score.pct);
  const eliminatoryResults = evaluateEliminatoryRules(rules, metrics);
  const anyRuleFailed = eliminatoryResults.some((r) => !r.passed);

  return {
    score,
    scoreVerdict,
    eliminatoryResults,
    finalVerdict: anyRuleFailed ? 'NO_GO' : scoreVerdict,
    supplantedByEliminatoryRule: anyRuleFailed && scoreVerdict !== 'NO_GO',
  };
}
