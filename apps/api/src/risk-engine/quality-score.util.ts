export interface ScoreInput {
  key: string;
  label: string;
  /** Part du score final, 0-1. */
  weight: number;
  /** 0-100, contribution brute avant pondération. */
  value: number;
  explanation: string;
}

export interface ScoreInputDefinition {
  key: string;
  label: string;
  weight: number;
  rationale: string;
}

export interface QualityScoreResult {
  score: number;
  inputs: ScoreInput[];
}

/**
 * Source unique des poids/libellés/justifications — les fonctions
 * xxxInput() ci-dessous lisent leur poids ici plutôt que de le redéclarer,
 * pour que GET /risk-model/methodology ne puisse jamais diverger du calcul
 * réel (même discipline que l'ancien factor-definitions.ts).
 */
export const QUALITY_INPUT_DEFINITIONS: ScoreInputDefinition[] = [
  {
    key: 'marge',
    label: 'Marge (BP figé, sinon actuelle)',
    weight: 0.3,
    rationale: "La marge prévue à l'origine est le premier indicateur de la qualité structurelle du montage — poids le plus élevé du score.",
  },
  {
    key: 'ltc',
    label: 'Loan-to-Cost',
    weight: 0.2,
    rationale: 'Un LTC élevé signale une opération plus dépendante de la collecte pour couvrir son coût de revient.',
  },
  {
    key: 'ltv',
    label: 'Loan-to-Value',
    weight: 0.15,
    rationale: 'Complète le LTC côté valeur de sortie — un LTV élevé réduit la marge de sécurité en cas de moins-value à la revente.',
  },
  {
    key: 'dependance_bancaire',
    label: 'Dépendance au financement bancaire',
    weight: 0.15,
    rationale: "Un financement bancaire complémentaire important ajoute un créancier senior et une contrainte de remboursement supplémentaire.",
  },
  {
    key: 'garanties',
    label: 'Garanties de rang 1 (couverture)',
    weight: 0.2,
    rationale: "Les sûretés de premier rang déterminent la récupération réelle en cas de défaut — pertinentes pour l'exposition finale, pas pour la probabilité du défaut.",
  },
];

function weightOf(key: string): number {
  const def = QUALITY_INPUT_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Poids inconnu pour l'entrée Quality "${key}".`);
  return def.weight;
}

export interface QualityScoreParams {
  /** Marge (%) — BP figé si disponible, sinon marge actuelle du modèle financier. */
  marginPct: number | null;
  /** Loan-to-Cost — fraction (0.70 = 70%), lue depuis synthesis.ratios.ltc. */
  ltc: number | null;
  /** Loan-to-Value — fraction, lue depuis synthesis.ratios.ltv. */
  ltv: number | null;
  bankFinancingEnabled: boolean;
  /** Part du financement bancaire dans le financement total (collecte + banque), 0-1. */
  bankLoanShare: number | null;
  /** Somme des garanties actives de rang 1 / amountRaised, 0+. */
  guaranteeCoverageRatio: number | null;
}

/**
 * Qualité structurelle du dossier — relativement stable, issue de
 * l'analyse initiale (marge, ratios de financement, sûretés). Volontairement
 * limité aux entrées calculables aujourd'hui à partir de données réelles :
 * l'expérience du porteur, la qualité de l'actif et la robustesse du
 * scénario de sortie (cités par le brief) sont différées à la Phase 2
 * (Operator Risk) faute de toute donnée existante pour les évaluer sans
 * fabriquer un proxy.
 */
export function computeQualityScore(params: QualityScoreParams): QualityScoreResult {
  const inputs: ScoreInput[] = [
    margeInput(params.marginPct),
    ltcInput(params.ltc),
    ltvInput(params.ltv),
    bankDependencyInput(params.bankFinancingEnabled, params.bankLoanShare),
    guaranteeCoverageInput(params.guaranteeCoverageRatio),
  ];

  const score = Math.round(inputs.reduce((sum, i) => sum + i.value * i.weight, 0));
  return { score: clamp(score), inputs };
}

function clamp(v: number): number {
  return Math.max(0, Math.min(100, v));
}

function margeInput(marginPct: number | null): ScoreInput {
  const value =
    marginPct === null ? 40 : marginPct >= 20 ? 100 : marginPct >= 15 ? 80 : marginPct >= 10 ? 60 : marginPct >= 5 ? 35 : marginPct >= 0 ? 15 : 0;
  return {
    key: 'marge',
    label: 'Marge (BP figé, sinon actuelle)',
    weight: weightOf('marge'),
    value,
    explanation: marginPct === null ? 'Aucune donnée de marge disponible.' : `Marge de ${marginPct.toFixed(1)}%.`,
  };
}

function ltcInput(ltc: number | null): ScoreInput {
  const value = ltc === null ? 40 : ltc <= 0.7 ? 100 : ltc <= 0.8 ? 80 : ltc <= 0.9 ? 60 : ltc <= 1.0 ? 40 : 15;
  return {
    key: 'ltc',
    label: 'Loan-to-Cost',
    weight: weightOf('ltc'),
    value,
    explanation: ltc === null ? 'LTC non calculable (modèle financier incomplet).' : `LTC de ${(ltc * 100).toFixed(0)}%.`,
  };
}

function ltvInput(ltv: number | null): ScoreInput {
  const value = ltv === null ? 40 : ltv <= 0.7 ? 100 : ltv <= 0.8 ? 80 : ltv <= 0.9 ? 60 : ltv <= 1.0 ? 40 : 15;
  return {
    key: 'ltv',
    label: 'Loan-to-Value',
    weight: weightOf('ltv'),
    value,
    explanation: ltv === null ? 'LTV non calculable (modèle financier incomplet).' : `LTV de ${(ltv * 100).toFixed(0)}%.`,
  };
}

function bankDependencyInput(enabled: boolean, share: number | null): ScoreInput {
  if (!enabled || share === null) {
    return { key: 'dependance_bancaire', label: 'Dépendance au financement bancaire', weight: weightOf('dependance_bancaire'), value: 100, explanation: 'Aucun financement bancaire complémentaire.' };
  }
  const value = share < 0.3 ? 70 : share <= 0.5 ? 50 : 30;
  return {
    key: 'dependance_bancaire',
    label: 'Dépendance au financement bancaire',
    weight: weightOf('dependance_bancaire'),
    value,
    explanation: `Financement bancaire = ${(share * 100).toFixed(0)}% du financement total.`,
  };
}

function guaranteeCoverageInput(ratio: number | null): ScoreInput {
  const value = ratio === null || ratio < 0.2 ? 15 : ratio < 0.5 ? 40 : ratio < 1.0 ? 70 : 100;
  return {
    key: 'garanties',
    label: 'Garanties de rang 1 (couverture)',
    weight: weightOf('garanties'),
    value,
    explanation:
      ratio === null || ratio === 0
        ? 'Aucune garantie de premier rang active.'
        : `Garanties de rang 1 couvrant ${(ratio * 100).toFixed(0)}% du capital restant dû.`,
  };
}
