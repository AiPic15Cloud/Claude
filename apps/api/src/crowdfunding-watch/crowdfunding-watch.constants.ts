export const DETECTION_QUEUE = 'crowdfunding.detection';
export const ENRICHMENT_QUEUE = 'crowdfunding.enrichment';
export const NOTIFICATION_QUEUE = 'crowdfunding.notification';

export const RECONCILE_JOB_ID = 'reconcile-registry';
export const SWEEP_JOB_ID = 'sweep-pending';
/** Intervalle des jobs internes du worker (reconciliation du registre, sweep de reprise) — distinct de targetCheckFrequencySeconds, propre à chaque plateforme. */
export const SWEEP_INTERVAL_MS = 60_000;

// BullMQ rejette un jobId personnalisé contenant exactement un ":"
// (réservé en interne au format des jobs répétables "id:hash:timestamp") —
// "-" partout, jamais ":", pour ne dépendre d'aucune règle de comptage
// interne à la librairie.

export function detectionJobId(sourceKey: string): string {
  return `detect-${sourceKey}`;
}

export function enrichmentJobId(observationId: string): string {
  return `enrich-${observationId}`;
}

export function notifyEventJobId(eventId: string): string {
  return `notify-${eventId}`;
}

export function notifyEntityMatchJobId(observationId: string, entityId: string): string {
  return `notify-match-${observationId}-${entityId}`;
}
