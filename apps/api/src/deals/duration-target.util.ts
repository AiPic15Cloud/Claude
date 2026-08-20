export type DurationTargetLevel = 'RAS' | 'ATTENTION' | 'URGENT';

export interface DurationTargetAlert {
  level: DurationTargetLevel;
  targetDate: Date | null;
  daysToTarget: number | null;
  stage: 'J30' | 'DEPASSEE' | null;
  actionLabel: string | null;
}

const DAY_MS = 86_400_000;

/**
 * Durée cible du financement (Deal.durationMonths, utilisée pour le calcul
 * des intérêts LPB/bancaires) ≠ échéance de vote (Deal.dateMax, process
 * J-90/J-60/J-30/J-15 déjà couvert par deadline.util.ts) — deux horizons
 * différents qui peuvent diverger. Ici : la durée réellement écoulée
 * depuis le démarrage de l'opération (Deal.startDate) rattrape la durée
 * cible du financement → moment de faire un point avec le porteur de
 * projet sur l'avancement réel, indépendamment du calendrier de vote.
 */
export function computeDurationTargetAlert(
  startDate: Date | null | undefined,
  durationMonths: number | null | undefined,
  now: Date = new Date(),
  repaid = false,
): DurationTargetAlert {
  if (repaid || !startDate || !durationMonths) {
    return { level: 'RAS', targetDate: null, daysToTarget: null, stage: null, actionLabel: null };
  }

  const targetDate = new Date(startDate);
  targetDate.setMonth(targetDate.getMonth() + durationMonths);
  const daysToTarget = Math.ceil((targetDate.getTime() - now.getTime()) / DAY_MS);

  if (daysToTarget <= 0) {
    return {
      level: 'URGENT',
      targetDate,
      daysToTarget,
      stage: 'DEPASSEE',
      actionLabel: "Durée cible du financement dépassée — faire un point avec le porteur de projet sur l'avancement réel et la date de remboursement.",
    };
  }
  if (daysToTarget <= 30) {
    return {
      level: 'ATTENTION',
      targetDate,
      daysToTarget,
      stage: 'J30',
      actionLabel: 'Durée cible du financement atteinte dans moins de 30 jours — anticiper un point avec le porteur de projet.',
    };
  }
  return { level: 'RAS', targetDate, daysToTarget, stage: null, actionLabel: null };
}
