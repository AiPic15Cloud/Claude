/**
 * Eliminatory Rule Engine (Complément H, point 8 — audit du classeur myVesta
 * x LPB). Une règle dure, indépendante du score pondéré (weighted-score.util.ts),
 * qui peut à elle seule faire basculer le verdict en NO GO. metricKey
 * référence un registre nommé de métriques déjà calculées par les autres
 * moteurs (returns.util.ts, lease-security.util.ts) — jamais un champ libre
 * ou une expression évaluée dynamiquement (même doctrine "jamais de score
 * composite opaque" que le reste du module).
 *
 * Une métrique introuvable (ex. WALB null faute de bail) n'est jamais
 * silencieusement traitée comme conforme — la règle est marquée non
 * conforme avec un message distinct de failMessage, pour ne jamais confondre
 * "donnée manquante" et "risque avéré" (spec V2 §10).
 */

export type EliminatoryMetricKey =
  | 'SECURED_NET_YIELD_PCT'
  | 'INVESTOR_NET_YIELD_PCT'
  | 'GROSS_YIELD_PCT'
  | 'WALB_YEARS'
  | 'WALT_YEARS'
  | 'IRR_PCT'
  | 'EQUITY_MULTIPLE'
  | 'SOURCES_USES_BALANCED';

export const ELIMINATORY_METRIC_LABELS: Record<EliminatoryMetricKey, string> = {
  SECURED_NET_YIELD_PCT: 'Secured Net Yield (%)',
  INVESTOR_NET_YIELD_PCT: 'Investor Net Yield (%)',
  GROSS_YIELD_PCT: 'Gross Yield (%)',
  WALB_YEARS: 'WALB (années)',
  WALT_YEARS: 'WALT (années)',
  IRR_PCT: 'TRI (%)',
  EQUITY_MULTIPLE: 'Equity Multiple (x)',
  SOURCES_USES_BALANCED: 'Sources = Uses (1 = équilibré, 0 = déséquilibré)',
};

export type ComparisonOperator = 'GTE' | 'LTE' | 'GT' | 'LT' | 'EQ';

export const COMPARISON_OPERATOR_LABELS: Record<ComparisonOperator, string> = {
  GTE: '≥',
  LTE: '≤',
  GT: '>',
  LT: '<',
  EQ: '=',
};

export interface EliminatoryMetricsInput {
  securedNetYieldPct: number;
  investorNetYieldPct: number;
  grossYieldPct: number;
  walbYears: number | null;
  waltYears: number | null;
  irrPct: number | null;
  equityMultiple: number | null;
  sourcesUsesBalanced: boolean;
}

function resolveMetric(key: EliminatoryMetricKey, metrics: EliminatoryMetricsInput): number | null {
  switch (key) {
    case 'SECURED_NET_YIELD_PCT':
      return metrics.securedNetYieldPct;
    case 'INVESTOR_NET_YIELD_PCT':
      return metrics.investorNetYieldPct;
    case 'GROSS_YIELD_PCT':
      return metrics.grossYieldPct;
    case 'WALB_YEARS':
      return metrics.walbYears;
    case 'WALT_YEARS':
      return metrics.waltYears;
    case 'IRR_PCT':
      return metrics.irrPct;
    case 'EQUITY_MULTIPLE':
      return metrics.equityMultiple;
    case 'SOURCES_USES_BALANCED':
      return metrics.sourcesUsesBalanced ? 1 : 0;
  }
}

function compare(observed: number, operator: ComparisonOperator, threshold: number): boolean {
  switch (operator) {
    case 'GTE':
      return observed >= threshold;
    case 'LTE':
      return observed <= threshold;
    case 'GT':
      return observed > threshold;
    case 'LT':
      return observed < threshold;
    case 'EQ':
      return observed === threshold;
  }
}

export interface EliminatoryRuleInput {
  id: string;
  label: string;
  metricKey: EliminatoryMetricKey;
  operator: ComparisonOperator;
  threshold: number;
  failMessage: string;
}

export interface EliminatoryRuleResult {
  ruleId: string;
  label: string;
  metricKey: EliminatoryMetricKey;
  observedValue: number | null;
  operator: ComparisonOperator;
  threshold: number;
  passed: boolean;
  /** Non nul uniquement si passed=false — failMessage de la règle, ou message générique si la métrique est indisponible. */
  failMessage: string | null;
}

const METRIC_UNAVAILABLE_MESSAGE = 'Donnée indisponible — impossible de vérifier cette règle (à distinguer d\'un risque avéré).';

export function evaluateEliminatoryRules(rules: EliminatoryRuleInput[], metrics: EliminatoryMetricsInput): EliminatoryRuleResult[] {
  return rules.map((rule) => {
    const observedValue = resolveMetric(rule.metricKey, metrics);
    if (observedValue === null) {
      return { ruleId: rule.id, label: rule.label, metricKey: rule.metricKey, observedValue, operator: rule.operator, threshold: rule.threshold, passed: false, failMessage: METRIC_UNAVAILABLE_MESSAGE };
    }
    const passed = compare(observedValue, rule.operator, rule.threshold);
    return { ruleId: rule.id, label: rule.label, metricKey: rule.metricKey, observedValue, operator: rule.operator, threshold: rule.threshold, passed, failMessage: passed ? null : rule.failMessage };
  });
}
