import type { CompetitorProjectEventType, ProjectObservationStatus } from '@prisma/client';

export interface ObservationEventDecision {
  eventType: CompetitorProjectEventType;
  discoveredAlreadyOpen: boolean;
}

/**
 * Détermine l'événement à émettre pour une observation (spec Lot 1 §2) —
 * extrait de ProjectObservationService.applyObservations en fonction pure
 * pour être testable sans transaction Prisma. Couvre exactement les cas du
 * §9 : annonce puis ouverture = deux événements distincts ; collecte
 * découverte directement ouverte = un seul événement, explicitement flagué ;
 * un statut inchangé ne doit jamais produire FUNDING_OPENED.
 *
 * `previousStatus === null` signifie une observation qui vient d'être créée
 * (jamais vue auparavant sur cette plateforme).
 */
export function decideObservationEvent(previousStatus: ProjectObservationStatus | null, newStatus: ProjectObservationStatus, isBaseline: boolean): ObservationEventDecision {
  if (previousStatus === null) {
    // Nouvelle observation. isBaseline (premier sync de la plateforme) prime toujours :
    // l'état initial n'est jamais présenté comme une découverte à notifier.
    if (isBaseline) return { eventType: 'PROJECT_DETECTED', discoveredAlreadyOpen: false };
    if (newStatus === 'EN_COLLECTE') return { eventType: 'FUNDING_OPENED', discoveredAlreadyOpen: true };
    return { eventType: 'PROJECT_DETECTED', discoveredAlreadyOpen: false };
  }

  if (previousStatus === newStatus) return { eventType: 'PROJECT_UPDATED', discoveredAlreadyOpen: false };
  if (previousStatus === 'A_VENIR' && newStatus === 'EN_COLLECTE') return { eventType: 'FUNDING_OPENED', discoveredAlreadyOpen: false };
  if (previousStatus === 'EN_COLLECTE' && newStatus === 'CLOTURE') return { eventType: 'FUNDING_CLOSED', discoveredAlreadyOpen: false };
  return { eventType: 'PROJECT_UPDATED', discoveredAlreadyOpen: false };
}
