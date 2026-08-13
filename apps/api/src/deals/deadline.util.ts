export type DeadlineLevel = 'RAS' | 'ATTENTION' | 'URGENT';

export interface DeadlineAlert {
  level: DeadlineLevel;
  daysToMax: number;
  stage: 'J90' | 'J60' | 'J30' | 'J15' | 'CONTENTIEUX' | null;
  actionLabel: string | null;
}

const DAY_MS = 86_400_000;

/**
 * Suivi des échéances de vote : process décrit par l'équipe —
 * J-90 : demande d'infos au porteur pour anticiper un éventuel vote.
 * J-60 : si pas de nouvelles, dernière relance avec délai précis + menace de
 *        transfert du dossier en interne.
 * J-30 : passage du dossier à Ben (fwd fil de mail) qui envoie un mail de
 *        pression avec 1 semaine de délai pour drafter.
 * J-15 : dernier délai pour la newsletter de vote.
 * Après J-0 sans réponse : passage en contentieux avec vote investisseur.
 */
export function computeDeadlineAlert(
  dateMax: Date | null | undefined,
  now: Date = new Date(),
  // Named for its original, narrower use — now also passed true for a deal
  // in DEFAUT stage (see isDealClosed()), since a defaulted deal has
  // already escalated past this deadline process entirely.
  repaid = false,
): DeadlineAlert {
  if (repaid || !dateMax) {
    return { level: 'RAS', daysToMax: Infinity, stage: null, actionLabel: null };
  }

  const daysToMax = Math.ceil((dateMax.getTime() - now.getTime()) / DAY_MS);

  if (daysToMax <= 0) {
    return {
      level: 'URGENT',
      daysToMax,
      stage: 'CONTENTIEUX',
      actionLabel: "Échéance max dépassée sans réponse — passage en contentieux avec vote investisseur.",
    };
  }
  if (daysToMax <= 15) {
    return {
      level: 'URGENT',
      daysToMax,
      stage: 'J15',
      actionLabel: 'J-15 : dernier délai pour drafter la newsletter de vote.',
    };
  }
  if (daysToMax <= 30) {
    return {
      level: 'URGENT',
      daysToMax,
      stage: 'J30',
      actionLabel: "J-30 : dossier à transférer à Ben (mail de pression, délai d'1 semaine).",
    };
  }
  if (daysToMax <= 60) {
    return {
      level: 'ATTENTION',
      daysToMax,
      stage: 'J60',
      actionLabel: 'J-60 : dernière relance au porteur avec délai précis, menace de transfert interne.',
    };
  }
  if (daysToMax <= 90) {
    return {
      level: 'ATTENTION',
      daysToMax,
      stage: 'J90',
      actionLabel: "J-90 : demander des informations au porteur pour anticiper un éventuel vote.",
    };
  }
  return { level: 'RAS', daysToMax, stage: null, actionLabel: null };
}
