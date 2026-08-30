import type { DealSurveillanceStatus } from '@prisma/client';
import type { Velocity } from './risk-velocity.util';

/**
 * Rang de sévérité des 6 statuts — sert à la fois à comparer deux statuts
 * (escalade/désescalade) et à appliquer un plancher (hard override, override
 * analyste). RECOVERY et WATCH partagent le même rang : un hard override
 * exigeant un plancher DISTRESSED les traite à égalité, et un override
 * analyste peut déplacer le statut au-dessus de ce plancher mais jamais en
 * dessous.
 */
export const SURVEILLANCE_RANK: Record<DealSurveillanceStatus, number> = {
  OUTPERFORMING: 0,
  PERFORMING: 1,
  RECOVERY: 2,
  WATCH: 2,
  DRIFTING: 3,
  DISTRESSED: 4,
};

const RANK_TO_BASE_STATUS: DealSurveillanceStatus[] = ['OUTPERFORMING', 'PERFORMING', 'WATCH', 'DRIFTING', 'DISTRESSED'];

// Durée pendant laquelle un dossier sorti de DISTRESSED reste affiché en
// RECOVERY plutôt que de retomber directement sur son palier de score réel —
// sans ce délai, RECOVERY n'apparaîtrait qu'un seul cycle de recalcul avant
// de disparaître, inutilisable comme signal de trajectoire pour l'analyste
// qui reconstruit la confiance envers un dossier assaini.
const RECOVERY_COOLDOWN_MS = 60 * 24 * 60 * 60 * 1000;

function baseBand(compositeScore: number): number {
  if (compositeScore < 20) return 0; // OUTPERFORMING
  if (compositeScore < 40) return 1; // PERFORMING
  if (compositeScore < 60) return 2; // WATCH
  if (compositeScore < 75) return 3; // DRIFTING
  return 4; // DISTRESSED
}

export interface ClassifySurveillanceInput {
  compositeScore: number;
  ewsScore: number;
  velocity: Velocity;
  previousSurveillanceStatus: DealSurveillanceStatus | null;
  recoveryWatchUntil: Date | null;
  now: Date;
  /** Planchers de tous les hard overrides actuellement actifs sur le dossier. */
  activeHardOverrideFloors: DealSurveillanceStatus[];
  /** Statut forcé par l'analyste, s'il y en a un actif. */
  analystOverrideStatus: DealSurveillanceStatus | null;
}

export interface ClassifySurveillanceResult {
  /** Statut avant tout override — utile à l'UI pour montrer "le score dirait X, mais...". */
  automaticStatus: DealSurveillanceStatus;
  finalStatus: DealSurveillanceStatus;
  newRecoveryWatchUntil: Date | null;
}

export function classifySurveillanceStatus(input: ClassifySurveillanceInput): ClassifySurveillanceResult {
  let band = baseBand(input.compositeScore);

  // Escalade : un EWS élevé ou une vélocité qui se dégrade rapidement peuvent
  // pousser le statut au-delà de ce que le seul score composite indiquerait —
  // une amélioration rapide (AMELIORATION) n'escalade jamais.
  if (input.ewsScore >= 50) band += 1;
  if (input.velocity.direction === 'AGGRAVATION') {
    if (input.velocity.band === 'DETERIORATION_RAPIDE') band += 2;
    else if (input.velocity.band === 'DERIVE') band += 1;
  }
  band = Math.min(band, RANK_TO_BASE_STATUS.length - 1);

  const scoreBasedStatus = RANK_TO_BASE_STATUS[band];

  // RECOVERY : état transitoire, pas une bande de score. Se déclenche
  // uniquement en sortie de DISTRESSED, se maintient pendant le cooldown.
  let automaticStatus: DealSurveillanceStatus = scoreBasedStatus;
  let newRecoveryWatchUntil = input.recoveryWatchUntil;

  const noHardOverrideActive = input.activeHardOverrideFloors.length === 0;
  const stillInCooldown = input.recoveryWatchUntil !== null && input.now < input.recoveryWatchUntil;

  if (
    input.previousSurveillanceStatus === 'DISTRESSED' &&
    SURVEILLANCE_RANK[scoreBasedStatus] <= SURVEILLANCE_RANK.WATCH &&
    noHardOverrideActive
  ) {
    automaticStatus = 'RECOVERY';
    newRecoveryWatchUntil = new Date(input.now.getTime() + RECOVERY_COOLDOWN_MS);
  } else if (input.previousSurveillanceStatus === 'RECOVERY' && stillInCooldown && noHardOverrideActive) {
    automaticStatus = 'RECOVERY';
  } else {
    newRecoveryWatchUntil = null;
  }

  // Plancher final : hard override ET override analyste ne peuvent jamais
  // faire baisser le statut sous le plus sévère des deux planchers actifs —
  // un override analyste peut en revanche monter plus haut que ce plancher.
  const candidateStatus = input.analystOverrideStatus ?? automaticStatus;
  const floorRank = Math.max(SURVEILLANCE_RANK[candidateStatus], ...input.activeHardOverrideFloors.map((f) => SURVEILLANCE_RANK[f]), 0);
  const finalStatus = statusForRank(floorRank, candidateStatus, input.activeHardOverrideFloors);

  return { automaticStatus, finalStatus, newRecoveryWatchUntil };
}

// RECOVERY et WATCH partagent le rang 2 — en cas d'égalité de rang, on
// préfère le statut réellement demandé (candidate) plutôt que d'imposer WATCH
// par défaut, sauf si c'est justement WATCH le plancher exigé par une règle.
function statusForRank(rank: number, candidate: DealSurveillanceStatus, floors: DealSurveillanceStatus[]): DealSurveillanceStatus {
  if (SURVEILLANCE_RANK[candidate] === rank) return candidate;
  const floorAtRank = floors.find((f) => SURVEILLANCE_RANK[f] === rank);
  return floorAtRank ?? RANK_TO_BASE_STATUS[rank] ?? 'DISTRESSED';
}
