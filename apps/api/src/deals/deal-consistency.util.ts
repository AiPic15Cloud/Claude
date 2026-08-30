import { isDealClosed } from '../common/deal-lifecycle.util';

/**
 * Un dossier réellement actif (isDealClosed() = false) mais dont le champ
 * Deal.status a été mis manuellement hors ACTIVE sort silencieusement du
 * sweep du Risk Engine, des alertes d'échéance et de la surveillance société
 * — status: 'ACTIVE' est le filtre dur de tous ces jobs de fond. Ce n'est
 * pas une erreur en soi (ON_HOLD peut être un choix délibéré), mais c'est un
 * angle mort invisible aujourd'hui : personne ne sait combien de dossiers
 * sont dans ce cas. Utilisé uniquement en agrégat (kpis().statusMonitoringGaps),
 * jamais comme un badge par dossier — voir le plan Phase 0 pour le raisonnement.
 */
export function isMonitoringSuppressedByStatus(deal: { status: string; repaid: boolean; stage: string }): boolean {
  return deal.status !== 'ACTIVE' && !isDealClosed(deal);
}
