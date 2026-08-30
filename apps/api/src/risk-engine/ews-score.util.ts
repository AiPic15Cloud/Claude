import type { DealRecoveryStatus } from '@prisma/client';
import type { NewsletterStatus } from '../deals/newsletter.util';
import type { DeadlineAlert } from '../deals/deadline.util';
import type { DurationTargetAlert } from '../deals/duration-target.util';

export interface TriggeredIndicator {
  key: string;
  label: string;
  points: number;
  explanation: string;
}

export interface EwsScoreResult {
  score: number;
  triggered: TriggeredIndicator[];
}

export interface EwsCheckpointFields {
  travauxBudgetInitial: number | null;
  travauxDepensesADate: number | null;
  prixVenteInitialPrevu: number | null;
  prixVenteReelADate: number | null;
  pourcentageVendu: number | null;
  commercialisationLancee: boolean;
}

export interface EwsScoreParams {
  deadlineAlert: DeadlineAlert;
  durationTargetAlert: DurationTargetAlert;
  /** null si aucun checkpoint n'a jamais été enregistré. */
  latestCheckpoint: EwsCheckpointFields | null;
  previousCheckpoint: EwsCheckpointFields | null;
  /** null si aucun checkpoint n'existe — traité comme "retard de reporting". */
  daysSinceLastCheckpoint: number | null;
  /** Nombre de sûretés actives aujourd'hui NON_VALIDE / EXPIRE_BIENTOT — chacune pointée individuellement, pas un seul "pire cas" global. */
  guaranteeNonValideCount: number;
  guaranteeExpireBientotCount: number;
  recoveryStatus: DealRecoveryStatus;
  porteurMonitoringStatus: string | null;
  chantierSignaleArret: boolean;
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  newsletterStatus: NewsletterStatus;
  environmentHazardCount: number | null;
}

const REPORTING_STALE_DAYS = 60; // fixe en Phase 1 — cadence configurable par dossier en Phase 4

export interface EwsIndicatorDefinition {
  key: string;
  label: string;
  /** Points maximum que cet indicateur peut apporter (le palier le plus sévère). */
  maxPoints: number;
  rationale: string;
}

/** Documentation exposée par GET /risk-model/methodology — les points réels sont calculés dans les fonctions pushXxx() ci-dessous, jamais dupliqués ici. */
export const EWS_INDICATOR_DEFINITIONS: EwsIndicatorDefinition[] = [
  { key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', maxPoints: 20, rationale: 'Un dépassement de plus de 15% du budget travaux initial est le seuil déjà utilisé pour le statut ROUGE du suivi chantier.' },
  { key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', maxPoints: 15, rationale: 'Un prix de vente réel très inférieur au prévisionnel signale une commercialisation plus difficile que prévu.' },
  { key: 'MARGE_A_DATE_NEGATIVE', label: 'Marge à date négative', maxPoints: 20, rationale: 'Une marge à date négative ou nulle est un signal fort, indépendant de tout autre indicateur.' },
  { key: 'STAGNATION_COMMERCIALE', label: 'Commercialisation stagnante', maxPoints: 10, rationale: 'Un pourcentage vendu qui ne progresse plus entre deux points de suivi, alors que la commercialisation est lancée.' },
  { key: 'DEGRADATION_ACCELEREE', label: 'Dépassement travaux en accélération', maxPoints: 5, rationale: "Le dépassement budgétaire s'aggrave d'un point de suivi à l'autre." },
  { key: 'RETARD_ADMINISTRATIF_ECHEANCE', label: 'Échéance de vote proche/dépassée', maxPoints: 20, rationale: "Réutilise directement les paliers J-60/J-30/J-15/contentieux déjà en place pour le suivi des échéances." },
  { key: 'RETARD_DUREE_CIBLE', label: 'Retard sur la durée cible du financement', maxPoints: 25, rationale: "Paliers progressifs J+10/J+30/J+60 sur le dépassement de la durée cible du financement (Deal.durationMonths), distincte de l'échéance de vote." },
  { key: 'RETARD_REPORTING', label: 'Reporting en retard', maxPoints: 10, rationale: "Un dossier sans point de suivi récent prive l'analyste de visibilité — seuil fixe de 60 jours en Phase 1, cadence configurable par dossier en Phase 4." },
  { key: 'GARANTIE_DEGRADEE', label: 'Garantie dégradée', maxPoints: 60, rationale: "15 pts (non valide) ou 7 pts (expire bientôt) par sûreté concernée, pas un seul pire-cas global — plusieurs sûretés dégradées s'accumulent." },
  { key: 'RECOUVREMENT', label: 'Situation juridique dégradée', maxPoints: 40, rationale: "La situation juridique du dossier (mise en demeure, contentieux, procédure collective) est un fait déjà constaté, pas un risque anticipé." },
  { key: 'PORTEUR', label: 'Santé administrative du porteur', maxPoints: 30, rationale: 'Une procédure collective ou une radiation chez le porteur conditionne sa capacité à mener le projet à terme.' },
  { key: 'MARGE_BP_DEGRADEE', label: 'Marge dégradée vs BP', maxPoints: 20, rationale: "Le même signal que la Performance Score, mais traité ici comme alerte précoce plutôt que comme composante d'un score d'exécution." },
  { key: 'CHANTIER_SIGNALE_ARRET', label: 'Chantier signalé à l’arrêt', maxPoints: 30, rationale: "Signal manuel de l'analyste — aucune donnée existante ne permet de détecter un chantier à l'arrêt de façon fiable." },
  { key: 'NEWSLETTER', label: 'Communication investisseurs', maxPoints: 8, rationale: 'Signal indirect et volontairement à faible poids — ce n’est pas un indicateur de risque opérationnel direct.' },
  { key: 'RISQUE_ENVIRONNEMENTAL', label: 'Risques environnementaux', maxPoints: 6, rationale: 'Structurel et rarement le facteur déclencheur à l’échéance du financement — poids faible et indicatif.' },
];

/**
 * Signaux d'alerte précoce — indicateurs paramétrables (une entrée =
 * une condition objective + un nombre de points fixe), jamais une
 * appréciation opaque de l'IA. Somme plafonnée à 100 ; le total brut peut
 * largement dépasser 100 par construction (un dossier réel ne déclenche
 * presque jamais tous les indicateurs à la fois).
 *
 * Indicateurs du brief explicitement différés faute de donnée aujourd'hui :
 * tension de trésorerie porteur (Phase 3), incident sur une autre opération
 * du même porteur et concentration (Phase 2), cadence de reporting
 * configurable par dossier (Phase 4).
 */
export function computeEwsScore(params: EwsScoreParams): EwsScoreResult {
  const triggered: TriggeredIndicator[] = [];

  pushChantierBudget(triggered, params.latestCheckpoint);
  pushCommercialisation(triggered, params.latestCheckpoint);
  pushMargeADateNegative(triggered, params.latestCheckpoint);
  pushStagnationCommerciale(triggered, params.latestCheckpoint, params.previousCheckpoint);
  pushDegradationAcceleree(triggered, params.latestCheckpoint, params.previousCheckpoint);
  pushEcheance(triggered, params.deadlineAlert);
  pushRetardDureeCible(triggered, params.durationTargetAlert);
  pushRetardReporting(triggered, params.daysSinceLastCheckpoint);
  pushGarantieDegradee(triggered, params.guaranteeNonValideCount, params.guaranteeExpireBientotCount);
  pushRecouvrement(triggered, params.recoveryStatus);
  pushPorteur(triggered, params.porteurMonitoringStatus);
  pushMargeBp(triggered, params.marginAlert);
  pushChantierArret(triggered, params.chantierSignaleArret);
  pushNewsletter(triggered, params.newsletterStatus);
  pushEnvironnement(triggered, params.environmentHazardCount);

  const rawTotal = triggered.reduce((sum, t) => sum + t.points, 0);
  return { score: Math.max(0, Math.min(100, rawTotal)), triggered };
}

function overspendPct(c: EwsCheckpointFields): number | null {
  const { travauxBudgetInitial: budget, travauxDepensesADate: depenses } = c;
  if (budget === null || budget <= 0 || depenses === null) return null;
  return ((depenses - budget) / budget) * 100;
}

function priceGapPct(c: EwsCheckpointFields): number | null {
  const { prixVenteInitialPrevu: prevu, prixVenteReelADate: reel } = c;
  if (prevu === null || prevu <= 0 || reel === null) return null;
  return ((reel - prevu) / prevu) * 100;
}

function pushChantierBudget(out: TriggeredIndicator[], latest: EwsCheckpointFields | null) {
  if (!latest) return;
  const pct = overspendPct(latest);
  if (pct === null) return;
  if (pct > 15) out.push({ key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', points: 20, explanation: `Dépassement travaux de ${pct.toFixed(0)}% vs budget initial.` });
  else if (pct > 5) out.push({ key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', points: 10, explanation: `Dépassement travaux de ${pct.toFixed(0)}% vs budget initial.` });
}

function pushCommercialisation(out: TriggeredIndicator[], latest: EwsCheckpointFields | null) {
  if (!latest) return;
  const pct = priceGapPct(latest);
  if (pct === null) return;
  if (pct < -15) out.push({ key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', points: 15, explanation: `Prix de vente ${Math.abs(pct).toFixed(0)}% en dessous du prévisionnel.` });
  else if (pct < -5) out.push({ key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', points: 7, explanation: `Prix de vente ${Math.abs(pct).toFixed(0)}% en dessous du prévisionnel.` });
}

function pushMargeADateNegative(out: TriggeredIndicator[], latest: EwsCheckpointFields | null) {
  if (!latest) return;
  const { prixVenteReelADate: reel, travauxDepensesADate: depenses } = latest;
  if (reel === null || depenses === null) return;
  if (reel - depenses <= 0) out.push({ key: 'MARGE_A_DATE_NEGATIVE', label: 'Marge à date négative', points: 20, explanation: 'La marge à date (ventes réelles − dépenses travaux) est négative ou nulle.' });
}

function pushStagnationCommerciale(out: TriggeredIndicator[], latest: EwsCheckpointFields | null, previous: EwsCheckpointFields | null) {
  if (!latest || !previous || !latest.commercialisationLancee) return;
  if (latest.pourcentageVendu === null || previous.pourcentageVendu === null) return;
  if (latest.pourcentageVendu - previous.pourcentageVendu <= 0) {
    out.push({ key: 'STAGNATION_COMMERCIALE', label: 'Commercialisation stagnante', points: 10, explanation: "Le pourcentage vendu n'a pas progressé depuis le dernier point de suivi." });
  }
}

function pushDegradationAcceleree(out: TriggeredIndicator[], latest: EwsCheckpointFields | null, previous: EwsCheckpointFields | null) {
  if (!latest || !previous) return;
  const latestOverspend = overspendPct(latest);
  const previousOverspend = overspendPct(previous);
  if (latestOverspend === null || previousOverspend === null) return;
  if (latestOverspend > 0 && latestOverspend > previousOverspend) {
    out.push({
      key: 'DEGRADATION_ACCELEREE',
      label: 'Dépassement travaux en accélération',
      points: 5,
      explanation: `Dépassement travaux passé de ${previousOverspend.toFixed(0)}% à ${latestOverspend.toFixed(0)}% depuis le point précédent.`,
    });
  }
}

function pushEcheance(out: TriggeredIndicator[], alert: DeadlineAlert) {
  const byStage: Record<string, number> = { CONTENTIEUX: 20, J15: 12, J30: 8, J60: 4 };
  const points = alert.stage ? byStage[alert.stage] : undefined;
  if (points) out.push({ key: 'RETARD_ADMINISTRATIF_ECHEANCE', label: 'Échéance de vote proche/dépassée', points, explanation: alert.actionLabel ?? 'Échéance sous surveillance.' });
}

function pushRetardDureeCible(out: TriggeredIndicator[], alert: DurationTargetAlert) {
  if (alert.stage !== 'DEPASSEE' || alert.daysToTarget === null) return;
  const daysOverdue = -alert.daysToTarget;
  let points: number | null = null;
  if (daysOverdue >= 60) points = 25;
  else if (daysOverdue >= 30) points = 15;
  else if (daysOverdue >= 10) points = 5;
  if (points) {
    out.push({
      key: 'RETARD_DUREE_CIBLE',
      label: 'Retard sur la durée cible du financement',
      points,
      explanation: `Durée cible dépassée de ${daysOverdue} jour(s).`,
    });
  }
}

function pushRetardReporting(out: TriggeredIndicator[], daysSince: number | null) {
  if (daysSince === null || daysSince > REPORTING_STALE_DAYS) {
    out.push({
      key: 'RETARD_REPORTING',
      label: 'Reporting en retard',
      points: 10,
      explanation: daysSince === null ? 'Aucun point de suivi jamais enregistré.' : `Dernier point de suivi il y a ${daysSince} jours (seuil : ${REPORTING_STALE_DAYS}).`,
    });
  }
}

function pushGarantieDegradee(out: TriggeredIndicator[], nonValideCount: number, expireBientotCount: number) {
  if (nonValideCount > 0) {
    out.push({
      key: 'GARANTIE_DEGRADEE_NON_VALIDE',
      label: 'Garantie(s) expirée(s)',
      points: 15 * nonValideCount,
      explanation: `${nonValideCount} garantie(s) active(s) ayant dépassé leur date de validité (15 pts chacune).`,
    });
  }
  if (expireBientotCount > 0) {
    out.push({
      key: 'GARANTIE_DEGRADEE_EXPIRE_BIENTOT',
      label: 'Garantie(s) expirant bientôt',
      points: 7 * expireBientotCount,
      explanation: `${expireBientotCount} garantie(s) expirant dans les 6 mois (7 pts chacune).`,
    });
  }
}

const RECOVERY_POINTS: Partial<Record<DealRecoveryStatus, number>> = {
  MISE_EN_DEMEURE: 20,
  CONTENTIEUX: 25,
  PROCEDURE_COLLECTIVE: 40,
};

function pushRecouvrement(out: TriggeredIndicator[], status: DealRecoveryStatus) {
  const points = RECOVERY_POINTS[status];
  if (points) out.push({ key: `RECOUVREMENT_${status}`, label: 'Situation juridique dégradée', points, explanation: `Situation juridique : ${status}.` });
}

function pushPorteur(out: TriggeredIndicator[], status: string | null) {
  if (status === 'procedure_collective') out.push({ key: 'PORTEUR_PROCEDURE_COLLECTIVE', label: 'Porteur en procédure collective', points: 30, explanation: 'Procédure collective en cours chez le porteur.' });
  else if (status === 'fermee') out.push({ key: 'PORTEUR_FERME', label: 'Porteur fermé/radié', points: 25, explanation: 'Société du porteur fermée ou radiée.' });
}

function pushMargeBp(out: TriggeredIndicator[], marginAlert: EwsScoreParams['marginAlert']) {
  if (!marginAlert) return;
  out.push({ key: 'MARGE_BP_DEGRADEE', label: 'Marge dégradée vs BP', points: marginAlert.level === 'URGENT' ? 20 : 10, explanation: marginAlert.message });
}

function pushChantierArret(out: TriggeredIndicator[], signale: boolean) {
  if (signale) out.push({ key: 'CHANTIER_SIGNALE_ARRET', label: 'Chantier signalé à l’arrêt', points: 30, explanation: "L'analyste a signalé ce chantier comme à l'arrêt." });
}

function pushNewsletter(out: TriggeredIndicator[], status: NewsletterStatus) {
  if (status === 'CRITIQUE') out.push({ key: 'NEWSLETTER_CRITIQUE', label: 'Communication investisseurs critique', points: 8, explanation: 'Newsletter investisseurs très en retard.' });
  else if (status === 'A_RELANCER') out.push({ key: 'NEWSLETTER_A_RELANCER', label: 'Communication investisseurs à relancer', points: 4, explanation: 'Newsletter investisseurs en retard.' });
}

function pushEnvironnement(out: TriggeredIndicator[], hazardCount: number | null) {
  if (hazardCount === null) return;
  if (hazardCount >= 2) out.push({ key: 'RISQUE_ENVIRONNEMENTAL', label: 'Risques environnementaux cumulés', points: 6, explanation: 'Plusieurs risques environnementaux identifiés (inondation, sismique).' });
  else if (hazardCount === 1) out.push({ key: 'RISQUE_ENVIRONNEMENTAL', label: 'Risque environnemental identifié', points: 3, explanation: 'Un risque environnemental identifié.' });
}
