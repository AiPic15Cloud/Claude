import type { DealRecoveryStatus, DealSurveillanceStatus, DealStage } from '@prisma/client';
import type { DeadlineAlert } from '../deals/deadline.util';

export interface HardOverrideDealState {
  porteurMonitoringStatus: string | null;
  recoveryStatus: DealRecoveryStatus;
  deadlineStage: DeadlineAlert['stage'];
  repaid: boolean;
  stage: DealStage;
  chantierSignaleArret: boolean;
  /** Garantie de rang 1 couvrant ≥50% du montant collecté, aujourd'hui NON_VALIDE. */
  hasCriticalExpiredGuarantee: boolean;
  /** Toute autre garantie active aujourd'hui NON_VALIDE. */
  hasOtherExpiredGuarantee: boolean;
  /** Durée cible du financement dépassée (voir duration-target.util.ts). */
  hasDurationOverdue: boolean;
}

export interface HardOverrideRule {
  key: string;
  label: string;
  minimumSurveillanceStatus: DealSurveillanceStatus;
  condition: (state: HardOverrideDealState) => boolean;
}

/**
 * Certains événements ne doivent jamais pouvoir être compensés
 * mathématiquement par de bons indicateurs ailleurs — chaque règle impose un
 * plancher minimum sur le statut de surveillance, quel que soit le score
 * composite. Évaluées à chaque recalcul par RiskOverrideService, qui ouvre/
 * résout les lignes RiskOverride correspondantes.
 *
 * DEFAUT_CARACTERISE est documentée mais n'est jamais réellement évaluée
 * dans le flux standard : un dossier en stage DEFAUT est déjà "clos"
 * (isDealClosed()) et sort de computeDealRisk() avant même d'atteindre
 * l'évaluation des hard overrides — conservée ici pour la méthodologie
 * exposée (GET /risk-model/methodology), pas pour son effet réel.
 */
export const HARD_OVERRIDE_RULES: HardOverrideRule[] = [
  {
    key: 'PROCEDURE_COLLECTIVE_PORTEUR',
    label: 'Procédure collective ouverte chez le porteur',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => s.porteurMonitoringStatus === 'procedure_collective',
  },
  {
    key: 'PROCEDURE_COLLECTIVE_RECOUVREMENT',
    label: 'Procédure collective (situation juridique du dossier)',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => s.recoveryStatus === 'PROCEDURE_COLLECTIVE',
  },
  {
    key: 'ECHEANCE_DEPASSEE',
    label: 'Échéance de vote dépassée sans remboursement',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => !s.repaid && s.deadlineStage === 'CONTENTIEUX',
  },
  {
    key: 'DEFAUT_CARACTERISE',
    label: 'Défaut caractérisé',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => s.stage === 'DEFAUT',
  },
  {
    key: 'GARANTIE_MAJEURE_EXPIREE_CRITIQUE',
    label: 'Garantie majeure (rang 1, ≥50% du montant collecté) expirée',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => s.hasCriticalExpiredGuarantee,
  },
  {
    key: 'GARANTIE_MAJEURE_EXPIREE',
    label: 'Garantie expirée sans renouvellement',
    minimumSurveillanceStatus: 'SOUS_SURVEILLANCE',
    condition: (s) => s.hasOtherExpiredGuarantee,
  },
  {
    key: 'CHANTIER_SIGNALE_ARRET',
    label: 'Chantier signalé à l’arrêt',
    minimumSurveillanceStatus: 'CRITIQUE',
    condition: (s) => s.chantierSignaleArret,
  },
  {
    key: 'MISE_EN_DEMEURE_AVEC_RETARD',
    label: 'Mise en demeure envoyée sur un dossier en retard',
    minimumSurveillanceStatus: 'SOUS_SURVEILLANCE',
    condition: (s) =>
      (s.recoveryStatus === 'MISE_EN_DEMEURE' || s.recoveryStatus === 'CONTENTIEUX' || s.recoveryStatus === 'PROCEDURE_COLLECTIVE') &&
      (s.deadlineStage !== null || s.hasDurationOverdue),
  },
];
