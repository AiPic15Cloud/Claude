import type { DealRecoveryStatus } from '@prisma/client';
import type { NewsletterStatus } from '../deals/newsletter.util';
import type { DeadlineAlert } from '../deals/deadline.util';
import type { DurationTargetAlert } from '../deals/duration-target.util';
import type { CheckpointHealthLevel } from '../deals/checkpoint-health.util';

export interface TriggeredIndicator {
  key: string;
  label: string;
  points: number;
  explanation: string;
}

export interface RiskScoreResult {
  score: number;
  triggered: TriggeredIndicator[];
}

export interface RiskIndicatorDefinition {
  key: string;
  label: string;
  /** Points maximum que cet indicateur peut apporter (le palier le plus sévère). */
  maxPoints: number;
  rationale: string;
}

export interface CheckpointFields {
  travauxBudgetInitial: number | null;
  travauxDepensesADate: number | null;
  prixVenteInitialPrevu: number | null;
  prixVenteReelADate: number | null;
  pourcentageVendu: number | null;
  commercialisationLancee: boolean;
}

export interface CheckpointSnapshot {
  pourcentageVendu: number | null;
  /** prixVenteReelADate - travauxDepensesADate, calculé par l'appelant. */
  margeADate: number | null;
}

export interface RiskScoreParams {
  // ── Signaux dynamiques (ex-EWS + ex-Performance) ──────────────────────
  deadlineAlert: DeadlineAlert;
  durationTargetAlert: DurationTargetAlert;
  /** null si aucun checkpoint n'a jamais été enregistré. */
  latestCheckpoint: CheckpointFields | null;
  previousCheckpoint: CheckpointFields | null;
  /** null si aucun checkpoint n'existe — traité comme "retard de reporting". */
  daysSinceLastCheckpoint: number | null;
  /** Nombre de sûretés actives aujourd'hui NON_VALIDE / EXPIRE_BIENTOT — chacune pointée individuellement, pas un seul "pire cas" global. */
  guaranteeNonValideCount: number;
  guaranteeExpireBientotCount: number;
  recoveryStatus: DealRecoveryStatus;
  porteurMonitoringStatus: string | null;
  chantierSignaleArret: boolean;
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  bpLocked: boolean;
  checkpointHealthLevel: CheckpointHealthLevel | null;
  /** (prixVenteActualise - prixVenteInitialPrevu) / prixVenteInitialPrevu × 100, calculé par l'appelant. */
  deltaPrixActualisePct: number | null;
  newsletterStatus: NewsletterStatus;
  environmentHazardCount: number | null;

  // ── Signaux structurels (ex-Quality) ───────────────────────────────────
  /** Marge (%) — BP figé si disponible, sinon marge actuelle du modèle financier. */
  marginPct: number | null;
  /** Loan-to-Cost — fraction (0.70 = 70%), lue depuis synthesis.ratios.ltc. */
  ltc: number | null;
  /** Loan-to-Value — fraction, lue depuis synthesis.ratios.ltv. */
  ltv: number | null;
  bankFinancingEnabled: boolean;
  /** Part du financement bancaire dans le financement total (collecte + banque), 0-1. */
  bankLoanShare: number | null;
  /** Somme des garanties actives de rang 1 / CRD, 0+. */
  guaranteeCoverageRatio: number | null;
}

const REPORTING_STALE_DAYS = 60; // fixe en Phase 1 — cadence configurable par dossier en Phase 4

/**
 * Documentation exposée par GET /risk-model/methodology — les points réels
 * sont calculés dans les fonctions pushXxx() ci-dessous, jamais dupliqués ici.
 *
 * Score additif unique (spec "Le Traçotin" A.2) : chaque indicateur est une
 * condition objective + un nombre de points fixe, jamais une appréciation
 * opaque de l'IA. Somme plafonnée à 100 ; le total brut peut largement
 * dépasser 100 par construction (un dossier réel ne déclenche presque jamais
 * tous les indicateurs à la fois). Remplace l'ancien blend pondéré Quality
 * (25%) / Performance (35%) / EWS (40%) — absorbe tous les signaux des trois
 * anciens sous-scores dans un seul système transparent, sans en perdre aucun.
 *
 * Aucun indicateur ne pénalise une donnée manquante par défaut (0 pt si non
 * calculable) — cohérent avec le principe déjà établi pour le moteur de
 * complétude (completeness.util.ts) : l'absence d'info dégrade la confiance
 * affichée séparément, jamais mécaniquement ce score.
 */
export const RISK_INDICATOR_DEFINITIONS: RiskIndicatorDefinition[] = [
  // Structurels (ex-Quality)
  { key: 'MARGE_STRUCTURELLE', label: 'Marge structurelle (BP figé, sinon actuelle)', maxPoints: 25, rationale: "La marge prévue à l'origine est le premier indicateur de la qualité structurelle du montage." },
  { key: 'LTC_ELEVE', label: 'Loan-to-Cost élevé', maxPoints: 20, rationale: 'Un LTC élevé signale une opération plus dépendante de la collecte pour couvrir son coût de revient.' },
  { key: 'LTV_ELEVE', label: 'Loan-to-Value élevé', maxPoints: 15, rationale: 'Un LTV élevé réduit la marge de sécurité en cas de moins-value à la revente.' },
  { key: 'DEPENDANCE_BANCAIRE', label: 'Dépendance au financement bancaire', maxPoints: 10, rationale: 'Un financement bancaire complémentaire important ajoute un créancier senior et une contrainte de remboursement supplémentaire.' },
  { key: 'GARANTIES_RANG1_FAIBLES', label: 'Garanties de rang 1 (couverture insuffisante)', maxPoints: 15, rationale: 'Les sûretés de premier rang déterminent la récupération réelle en cas de défaut.' },
  // Dynamiques (ex-Performance + ex-EWS)
  { key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', maxPoints: 20, rationale: 'Un dépassement de plus de 15% du budget travaux initial est le seuil déjà utilisé pour le statut ROUGE du suivi chantier.' },
  { key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', maxPoints: 15, rationale: 'Un prix de vente réel très inférieur au prévisionnel signale une commercialisation plus difficile que prévu.' },
  { key: 'MARGE_A_DATE_NEGATIVE', label: 'Marge à date négative', maxPoints: 20, rationale: 'Une marge à date négative ou nulle est un signal fort, indépendant de tout autre indicateur.' },
  { key: 'STAGNATION_COMMERCIALE', label: 'Commercialisation stagnante', maxPoints: 10, rationale: 'Un pourcentage vendu qui ne progresse plus entre deux points de suivi, alors que la commercialisation est lancée.' },
  { key: 'DEGRADATION_ACCELEREE', label: 'Dépassement travaux en accélération', maxPoints: 5, rationale: "Le dépassement budgétaire s'aggrave d'un point de suivi à l'autre." },
  { key: 'RETARD_ADMINISTRATIF_ECHEANCE', label: 'Échéance de vote proche/dépassée', maxPoints: 20, rationale: 'Réutilise directement les paliers J-60/J-30/J-15/contentieux déjà en place pour le suivi des échéances.' },
  { key: 'RETARD_DUREE_CIBLE', label: 'Retard sur la durée cible du financement', maxPoints: 25, rationale: 'Paliers progressifs +5 pts à J+10, +15 pts à J+30, +25 pts à J+60 sur le dépassement de la durée cible du financement.' },
  { key: 'RETARD_REPORTING', label: 'Reporting en retard', maxPoints: 10, rationale: "Un dossier sans point de suivi récent prive l'analyste de visibilité — seuil fixe de 60 jours." },
  { key: 'GARANTIE_DEGRADEE', label: 'Garantie dégradée', maxPoints: 60, rationale: '15 pts (non valide) ou 7 pts (expire bientôt) par sûreté concernée, pas un seul pire-cas global.' },
  { key: 'RECOUVREMENT', label: 'Situation juridique dégradée', maxPoints: 40, rationale: 'Mise en demeure (+20), contentieux (+25) ou procédure collective (+40, déclenche aussi un plancher dur CRITIQUE indépendant de ce score).' },
  { key: 'PORTEUR', label: 'Santé administrative du porteur', maxPoints: 30, rationale: 'Une procédure collective ou une radiation chez le porteur conditionne sa capacité à mener le projet à terme.' },
  { key: 'MARGE_VS_BP', label: 'Marge réelle vs BP', maxPoints: 20, rationale: "Dérive entre la marge réelle et le business plan figé — seuil -10% déclenche une alerte de surveillance." },
  { key: 'SUIVI_CHANTIER_DEGRADE', label: 'Suivi chantier / commercialisation dégradé', maxPoints: 15, rationale: "L'avancement réel du chantier et de la commercialisation face au prévisionnel." },
  { key: 'PRIX_ACTUALISE_BAISSE', label: 'Prix de vente actualisé en baisse', maxPoints: 10, rationale: 'Un objectif de prix revu à la baisse par le porteur signale une commercialisation plus difficile que prévu.' },
  { key: 'TENDANCE_DEGRADEE', label: 'Tendance checkpoint-à-checkpoint dégradée', maxPoints: 8, rationale: 'Compare le dernier point de suivi au précédent — capte une dégradation en cours, pas seulement un écart cumulé.' },
  { key: 'CHANTIER_SIGNALE_ARRET', label: 'Chantier signalé à l’arrêt', maxPoints: 30, rationale: "Signal manuel de l'analyste — aucune donnée existante ne permet de détecter un chantier à l'arrêt de façon fiable." },
  { key: 'NEWSLETTER', label: 'Communication investisseurs', maxPoints: 8, rationale: 'Signal indirect et volontairement à faible poids — ce n’est pas un indicateur de risque opérationnel direct.' },
  { key: 'RISQUE_ENVIRONNEMENTAL', label: 'Risques environnementaux', maxPoints: 6, rationale: 'Structurel et rarement le facteur déclencheur à l’échéance du financement — poids faible et indicatif.' },
];

export function computeRiskScore(params: RiskScoreParams): RiskScoreResult {
  const triggered: TriggeredIndicator[] = [];

  // Structurels
  pushMargeStructurelle(triggered, params.marginPct);
  pushLtcEleve(triggered, params.ltc);
  pushLtvEleve(triggered, params.ltv);
  pushDependanceBancaire(triggered, params.bankFinancingEnabled, params.bankLoanShare);
  pushGarantiesRang1Faibles(triggered, params.guaranteeCoverageRatio);

  // Dynamiques
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
  pushMargeVsBp(triggered, params.marginAlert, params.bpLocked);
  pushSuiviChantierDegrade(triggered, params.checkpointHealthLevel);
  pushPrixActualiseBaisse(triggered, params.deltaPrixActualisePct);
  pushTendanceDegradee(triggered, toSnapshot(params.latestCheckpoint), toSnapshot(params.previousCheckpoint));
  pushChantierArret(triggered, params.chantierSignaleArret);
  pushNewsletter(triggered, params.newsletterStatus);
  pushEnvironnement(triggered, params.environmentHazardCount);

  const rawTotal = triggered.reduce((sum, t) => sum + t.points, 0);
  return { score: Math.max(0, Math.min(100, rawTotal)), triggered };
}

function toSnapshot(c: CheckpointFields | null): CheckpointSnapshot | null {
  if (!c) return null;
  const margeADate = c.prixVenteReelADate !== null && c.travauxDepensesADate !== null ? c.prixVenteReelADate - c.travauxDepensesADate : null;
  return { pourcentageVendu: c.pourcentageVendu, margeADate };
}

// ── Structurels (ex-Quality) ─────────────────────────────────────────────

function pushMargeStructurelle(out: TriggeredIndicator[], marginPct: number | null) {
  if (marginPct === null) return;
  if (marginPct < 0) out.push({ key: 'MARGE_STRUCTURELLE', label: 'Marge structurelle négative', points: 25, explanation: `Marge structurelle de ${marginPct.toFixed(1)}%.` });
  else if (marginPct < 5) out.push({ key: 'MARGE_STRUCTURELLE', label: 'Marge structurelle très faible', points: 15, explanation: `Marge structurelle de ${marginPct.toFixed(1)}%.` });
  else if (marginPct < 10) out.push({ key: 'MARGE_STRUCTURELLE', label: 'Marge structurelle faible', points: 8, explanation: `Marge structurelle de ${marginPct.toFixed(1)}%.` });
  else if (marginPct < 15) out.push({ key: 'MARGE_STRUCTURELLE', label: 'Marge structurelle modérée', points: 3, explanation: `Marge structurelle de ${marginPct.toFixed(1)}%.` });
}

function pushLtcEleve(out: TriggeredIndicator[], ltc: number | null) {
  if (ltc === null) return;
  if (ltc > 1.0) out.push({ key: 'LTC_ELEVE', label: 'Loan-to-Cost très élevé', points: 20, explanation: `LTC de ${(ltc * 100).toFixed(0)}%.` });
  else if (ltc > 0.9) out.push({ key: 'LTC_ELEVE', label: 'Loan-to-Cost élevé', points: 12, explanation: `LTC de ${(ltc * 100).toFixed(0)}%.` });
  else if (ltc > 0.8) out.push({ key: 'LTC_ELEVE', label: 'Loan-to-Cost modéré', points: 6, explanation: `LTC de ${(ltc * 100).toFixed(0)}%.` });
}

function pushLtvEleve(out: TriggeredIndicator[], ltv: number | null) {
  if (ltv === null) return;
  if (ltv > 1.0) out.push({ key: 'LTV_ELEVE', label: 'Loan-to-Value très élevé', points: 15, explanation: `LTV de ${(ltv * 100).toFixed(0)}%.` });
  else if (ltv > 0.9) out.push({ key: 'LTV_ELEVE', label: 'Loan-to-Value élevé', points: 9, explanation: `LTV de ${(ltv * 100).toFixed(0)}%.` });
  else if (ltv > 0.8) out.push({ key: 'LTV_ELEVE', label: 'Loan-to-Value modéré', points: 4, explanation: `LTV de ${(ltv * 100).toFixed(0)}%.` });
}

function pushDependanceBancaire(out: TriggeredIndicator[], enabled: boolean, share: number | null) {
  if (!enabled || share === null) return;
  if (share > 0.5) out.push({ key: 'DEPENDANCE_BANCAIRE', label: 'Forte dépendance au financement bancaire', points: 10, explanation: `Financement bancaire = ${(share * 100).toFixed(0)}% du financement total.` });
  else if (share >= 0.3) out.push({ key: 'DEPENDANCE_BANCAIRE', label: 'Dépendance modérée au financement bancaire', points: 5, explanation: `Financement bancaire = ${(share * 100).toFixed(0)}% du financement total.` });
}

function pushGarantiesRang1Faibles(out: TriggeredIndicator[], ratio: number | null) {
  if (ratio === null) return;
  if (ratio < 0.2) out.push({ key: 'GARANTIES_RANG1_FAIBLES', label: 'Garanties de rang 1 très insuffisantes', points: 15, explanation: ratio === 0 ? 'Aucune garantie de premier rang active.' : `Garanties de rang 1 couvrant ${(ratio * 100).toFixed(0)}% du capital restant dû.` });
  else if (ratio < 0.5) out.push({ key: 'GARANTIES_RANG1_FAIBLES', label: 'Garanties de rang 1 insuffisantes', points: 8, explanation: `Garanties de rang 1 couvrant ${(ratio * 100).toFixed(0)}% du capital restant dû.` });
  else if (ratio < 1.0) out.push({ key: 'GARANTIES_RANG1_FAIBLES', label: 'Garanties de rang 1 partielles', points: 3, explanation: `Garanties de rang 1 couvrant ${(ratio * 100).toFixed(0)}% du capital restant dû.` });
}

// ── Dynamiques (ex-Performance + ex-EWS) ─────────────────────────────────

function overspendPct(c: CheckpointFields): number | null {
  const { travauxBudgetInitial: budget, travauxDepensesADate: depenses } = c;
  if (budget === null || budget <= 0 || depenses === null) return null;
  return ((depenses - budget) / budget) * 100;
}

function priceGapPct(c: CheckpointFields): number | null {
  const { prixVenteInitialPrevu: prevu, prixVenteReelADate: reel } = c;
  if (prevu === null || prevu <= 0 || reel === null) return null;
  return ((reel - prevu) / prevu) * 100;
}

function pushChantierBudget(out: TriggeredIndicator[], latest: CheckpointFields | null) {
  if (!latest) return;
  const pct = overspendPct(latest);
  if (pct === null) return;
  if (pct > 15) out.push({ key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', points: 20, explanation: `Dépassement travaux de ${pct.toFixed(0)}% vs budget initial.` });
  else if (pct > 5) out.push({ key: 'RETARD_CHANTIER_BUDGET', label: 'Dépassement budget travaux', points: 10, explanation: `Dépassement travaux de ${pct.toFixed(0)}% vs budget initial.` });
}

function pushCommercialisation(out: TriggeredIndicator[], latest: CheckpointFields | null) {
  if (!latest) return;
  const pct = priceGapPct(latest);
  if (pct === null) return;
  if (pct < -15) out.push({ key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', points: 15, explanation: `Prix de vente ${Math.abs(pct).toFixed(0)}% en dessous du prévisionnel.` });
  else if (pct < -5) out.push({ key: 'RETARD_COMMERCIALISATION', label: 'Prix de vente en retrait', points: 7, explanation: `Prix de vente ${Math.abs(pct).toFixed(0)}% en dessous du prévisionnel.` });
}

function pushMargeADateNegative(out: TriggeredIndicator[], latest: CheckpointFields | null) {
  if (!latest) return;
  const { prixVenteReelADate: reel, travauxDepensesADate: depenses } = latest;
  if (reel === null || depenses === null) return;
  if (reel - depenses <= 0) out.push({ key: 'MARGE_A_DATE_NEGATIVE', label: 'Marge à date négative', points: 20, explanation: 'La marge à date (ventes réelles − dépenses travaux) est négative ou nulle.' });
}

function pushStagnationCommerciale(out: TriggeredIndicator[], latest: CheckpointFields | null, previous: CheckpointFields | null) {
  if (!latest || !previous || !latest.commercialisationLancee) return;
  if (latest.pourcentageVendu === null || previous.pourcentageVendu === null) return;
  if (latest.pourcentageVendu - previous.pourcentageVendu <= 0) {
    out.push({ key: 'STAGNATION_COMMERCIALE', label: 'Commercialisation stagnante', points: 10, explanation: "Le pourcentage vendu n'a pas progressé depuis le dernier point de suivi." });
  }
}

function pushDegradationAcceleree(out: TriggeredIndicator[], latest: CheckpointFields | null, previous: CheckpointFields | null) {
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

/** Fusion de l'ancien Performance.marge_vs_bp et EWS.MARGE_BP_DEGRADEE — même signal (marginAlert), un seul indicateur pour éviter un double-comptage. */
function pushMargeVsBp(out: TriggeredIndicator[], marginAlert: RiskScoreParams['marginAlert'], bpLocked: boolean) {
  if (!bpLocked || !marginAlert) return;
  out.push({ key: 'MARGE_VS_BP', label: 'Marge réelle vs BP dégradée', points: marginAlert.level === 'URGENT' ? 20 : 10, explanation: marginAlert.message });
}

function pushSuiviChantierDegrade(out: TriggeredIndicator[], level: CheckpointHealthLevel | null) {
  if (level === 'ROUGE') out.push({ key: 'SUIVI_CHANTIER_DEGRADE', label: 'Suivi chantier dégradé', points: 15, explanation: 'Dernier point de suivi : ROUGE.' });
  else if (level === 'ORANGE') out.push({ key: 'SUIVI_CHANTIER_DEGRADE', label: 'Suivi chantier à surveiller', points: 7, explanation: 'Dernier point de suivi : ORANGE.' });
}

function pushPrixActualiseBaisse(out: TriggeredIndicator[], deltaPct: number | null) {
  if (deltaPct === null || deltaPct >= -5) return;
  if (deltaPct < -15) out.push({ key: 'PRIX_ACTUALISE_BAISSE', label: 'Prix de vente actualisé en forte baisse', points: 10, explanation: `Prix actualisé ${deltaPct.toFixed(1)}% vs prévisionnel.` });
  else out.push({ key: 'PRIX_ACTUALISE_BAISSE', label: 'Prix de vente actualisé en baisse', points: 5, explanation: `Prix actualisé ${deltaPct.toFixed(1)}% vs prévisionnel.` });
}

function pushTendanceDegradee(out: TriggeredIndicator[], latest: CheckpointSnapshot | null, previous: CheckpointSnapshot | null) {
  if (!latest || !previous) return;
  const deltaVendu = latest.pourcentageVendu !== null && previous.pourcentageVendu !== null ? latest.pourcentageVendu - previous.pourcentageVendu : null;
  const deltaMarge = latest.margeADate !== null && previous.margeADate !== null ? latest.margeADate - previous.margeADate : null;

  const negatives = [deltaVendu, deltaMarge].filter((d) => d !== null && d < 0).length;
  if (negatives === 0) return;

  const parts: string[] = [];
  if (deltaVendu !== null) parts.push(`% vendu ${deltaVendu >= 0 ? '+' : ''}${deltaVendu}pts`);
  if (deltaMarge !== null) parts.push(`marge à date ${deltaMarge >= 0 ? '+' : ''}${Math.round(deltaMarge).toLocaleString('fr-FR')}€`);
  const explanation = `Depuis le point précédent : ${parts.join(', ')}.`;

  if (negatives === 2) out.push({ key: 'TENDANCE_DEGRADEE', label: '% vendu et marge à date tous deux en baisse', points: 8, explanation });
  else out.push({ key: 'TENDANCE_DEGRADEE', label: 'Tendance checkpoint-à-checkpoint en baisse', points: 4, explanation });
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
