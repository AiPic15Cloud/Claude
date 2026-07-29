export type CheckpointHealthLevel = 'VERT' | 'ORANGE' | 'ROUGE';

export interface CheckpointHealth {
  level: CheckpointHealthLevel | null;
  reasons: string[];
  checkpointDate: Date | null;
}

interface CheckpointHealthInput {
  travauxBudgetInitial: number | null;
  travauxDepensesADate: number | null;
  prixVenteInitialPrevu: number | null;
  prixVenteReelADate: number | null;
  createdAt: Date;
}

const LEVEL_RANK: Record<CheckpointHealthLevel, number> = { VERT: 0, ORANGE: 1, ROUGE: 2 };

function worse(a: CheckpointHealthLevel, b: CheckpointHealthLevel): CheckpointHealthLevel {
  return LEVEL_RANK[b] > LEVEL_RANK[a] ? b : a;
}

/**
 * Seuils calés sur l'exemple donné en réunion (Ben) : un dépassement de
 * travaux ou un écart de prix de vente réel de plus de 15% par rapport aux
 * prévisions initiales est le signal d'alerte concret ; en dessous, 5%
 * marque déjà un passage en vigilance. Une marge à date nulle ou négative
 * est toujours rouge, quels que soient les autres écarts.
 */
export function computeCheckpointHealth(checkpoint: CheckpointHealthInput | null): CheckpointHealth {
  if (!checkpoint) return { level: null, reasons: [], checkpointDate: null };

  const { travauxBudgetInitial: budget, travauxDepensesADate: depenses, prixVenteInitialPrevu: prixPrevu, prixVenteReelADate: prixReel } = checkpoint;

  let level: CheckpointHealthLevel = 'VERT';
  const reasons: string[] = [];

  if (budget !== null && budget > 0 && depenses !== null) {
    const overspendPct = ((depenses - budget) / budget) * 100;
    if (overspendPct > 15) {
      level = worse(level, 'ROUGE');
      reasons.push(`Dépassement travaux de ${overspendPct.toFixed(0)}% vs budget initial`);
    } else if (overspendPct > 5) {
      level = worse(level, 'ORANGE');
      reasons.push(`Dépassement travaux de ${overspendPct.toFixed(0)}% vs budget initial`);
    }
  }

  if (prixPrevu !== null && prixPrevu > 0 && prixReel !== null) {
    const priceGapPct = ((prixReel - prixPrevu) / prixPrevu) * 100;
    if (priceGapPct < -15) {
      level = worse(level, 'ROUGE');
      reasons.push(`Prix de vente ${Math.abs(priceGapPct).toFixed(0)}% en dessous du prévisionnel`);
    } else if (priceGapPct < -5) {
      level = worse(level, 'ORANGE');
      reasons.push(`Prix de vente ${Math.abs(priceGapPct).toFixed(0)}% en dessous du prévisionnel`);
    }
  }

  if (depenses !== null && prixReel !== null && prixReel - depenses <= 0) {
    level = worse(level, 'ROUGE');
    reasons.push('Marge à date négative ou nulle');
  }

  const hasAnyData = budget !== null || depenses !== null || prixPrevu !== null || prixReel !== null;
  if (!hasAnyData) return { level: null, reasons: [], checkpointDate: checkpoint.createdAt };

  return { level, reasons, checkpointDate: checkpoint.createdAt };
}
