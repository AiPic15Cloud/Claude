import type { CheckpointHealthLevel } from '../deals/checkpoint-health.util';
import type { ScoreInput, ScoreInputDefinition } from './quality-score.util';

export interface PerformanceScoreResult {
  score: number;
  inputs: ScoreInput[];
}

export const PERFORMANCE_INPUT_DEFINITIONS: ScoreInputDefinition[] = [
  {
    key: 'marge_vs_bp',
    label: 'Marge réelle vs BP',
    weight: 0.4,
    rationale: "L'écart de marge par rapport au BP figé est le signal financier le plus direct d'une exécution qui dérive.",
  },
  {
    key: 'suivi_chantier',
    label: 'Suivi chantier / commercialisation',
    weight: 0.3,
    rationale: "L'avancement réel du chantier et de la commercialisation face au prévisionnel est l'indicateur le plus tangible de la trajectoire du projet.",
  },
  {
    key: 'prix_actualise',
    label: 'Prix de vente actualisé vs prévu',
    weight: 0.15,
    rationale: 'Un objectif de prix revu à la baisse par le porteur signale une commercialisation plus difficile que prévu.',
  },
  {
    key: 'tendance',
    label: 'Tendance checkpoint-à-checkpoint',
    weight: 0.15,
    rationale: "Compare le dernier point de suivi au précédent plutôt qu'aux seules valeurs initiales — capte une amélioration ou une dégradation en cours, pas seulement l'écart cumulé depuis le début.",
  },
];

function weightOf(key: string): number {
  const def = PERFORMANCE_INPUT_DEFINITIONS.find((d) => d.key === key);
  if (!def) throw new Error(`Poids inconnu pour l'entrée Performance "${key}".`);
  return def.weight;
}

export interface CheckpointSnapshot {
  pourcentageVendu: number | null;
  /** prixVenteReelADate - travauxDepensesADate, calculé par l'appelant. */
  margeADate: number | null;
}

export interface PerformanceScoreParams {
  /** null si le BP n'a jamais été figé — pas d'ATTENTION/URGENT possible sans référence. */
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  bpLocked: boolean;
  checkpointHealthLevel: CheckpointHealthLevel | null;
  /** (prixVenteActualise - prixVenteInitialPrevu) / prixVenteInitialPrevu × 100, calculé par l'appelant. */
  deltaPrixActualisePct: number | null;
  /** Les 2 checkpoints les plus récents, du plus récent (index 0) au plus ancien. */
  latestCheckpoint: CheckpointSnapshot | null;
  previousCheckpoint: CheckpointSnapshot | null;
}

/**
 * Exécution réelle vs BP — construit à 100% sur des données déjà saisies
 * aujourd'hui (aucune nouvelle saisie requise pour que ce score existe dès
 * le jour 1). Introduit la première vraie comparaison checkpoint-à-checkpoint
 * du produit (le sous-score "Tendance") : jusqu'ici chaque checkpoint n'était
 * comparé qu'à ses propres valeurs initiales figées, jamais au précédent.
 */
export function computePerformanceScore(params: PerformanceScoreParams): PerformanceScoreResult {
  const inputs: ScoreInput[] = [
    margeVsBpInput(params.marginAlert, params.bpLocked),
    checkpointHealthInput(params.checkpointHealthLevel),
    prixActualiseInput(params.deltaPrixActualisePct),
    trendInput(params.latestCheckpoint, params.previousCheckpoint),
  ];

  const score = Math.round(inputs.reduce((sum, i) => sum + i.value * i.weight, 0));
  return { score: Math.max(0, Math.min(100, score)), inputs };
}

function margeVsBpInput(marginAlert: PerformanceScoreParams['marginAlert'], bpLocked: boolean): ScoreInput {
  const weight = weightOf('marge_vs_bp');
  if (!bpLocked) {
    return { key: 'marge_vs_bp', label: 'Marge réelle vs BP', weight, value: 50, explanation: 'BP initial jamais figé — comparaison impossible, valeur neutre.' };
  }
  if (marginAlert === null) {
    return { key: 'marge_vs_bp', label: 'Marge réelle vs BP', weight, value: 100, explanation: 'Marge conforme au BP figé.' };
  }
  return {
    key: 'marge_vs_bp',
    label: 'Marge réelle vs BP',
    weight,
    value: marginAlert.level === 'URGENT' ? 10 : 55,
    explanation: marginAlert.message,
  };
}

function checkpointHealthInput(level: CheckpointHealthLevel | null): ScoreInput {
  const value = level === 'VERT' ? 100 : level === 'ORANGE' ? 55 : level === 'ROUGE' ? 10 : 50;
  return {
    key: 'suivi_chantier',
    label: 'Suivi chantier / commercialisation',
    weight: weightOf('suivi_chantier'),
    value,
    explanation: level ? `Dernier point de suivi : ${level}.` : 'Aucun point de suivi chantier enregistré.',
  };
}

function prixActualiseInput(deltaPct: number | null): ScoreInput {
  const value = deltaPct === null ? 50 : deltaPct >= 0 ? 100 : deltaPct >= -5 ? 75 : deltaPct >= -15 ? 45 : 15;
  return {
    key: 'prix_actualise',
    label: 'Prix de vente actualisé vs prévu',
    weight: weightOf('prix_actualise'),
    value,
    explanation: deltaPct === null ? "Pas d'objectif de prix revu enregistré." : `Prix actualisé ${deltaPct >= 0 ? '+' : ''}${deltaPct.toFixed(1)}% vs prévisionnel.`,
  };
}

function trendInput(latest: CheckpointSnapshot | null, previous: CheckpointSnapshot | null): ScoreInput {
  const weight = weightOf('tendance');
  if (!latest || !previous) {
    return { key: 'tendance', label: 'Tendance checkpoint-à-checkpoint', weight, value: 50, explanation: 'Moins de 2 points de suivi — tendance non calculable.' };
  }

  const tierFromDelta = (delta: number | null) => (delta === null ? 50 : delta >= 5 ? 100 : delta >= 0 ? 65 : 20);

  const deltaVendu = latest.pourcentageVendu !== null && previous.pourcentageVendu !== null ? latest.pourcentageVendu - previous.pourcentageVendu : null;
  const deltaMarge = latest.margeADate !== null && previous.margeADate !== null ? latest.margeADate - previous.margeADate : null;

  const vendueScore = tierFromDelta(deltaVendu);
  const margeScore = tierFromDelta(deltaMarge);
  const value = Math.round((vendueScore + margeScore) / 2);

  const parts: string[] = [];
  if (deltaVendu !== null) parts.push(`% vendu ${deltaVendu >= 0 ? '+' : ''}${deltaVendu}pts`);
  if (deltaMarge !== null) parts.push(`marge à date ${deltaMarge >= 0 ? '+' : ''}${Math.round(deltaMarge).toLocaleString('fr-FR')}€`);

  return {
    key: 'tendance',
    label: 'Tendance checkpoint-à-checkpoint',
    weight,
    value,
    explanation: parts.length > 0 ? `Depuis le point précédent : ${parts.join(', ')}.` : 'Données insuffisantes pour comparer les deux derniers points.',
  };
}
