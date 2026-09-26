import type { LeaseAssessment } from './lease-security.util';
import type { EligibilityResult } from './eligibility.util';
import type { StressScenarioResult } from './stress-testing.util';

/**
 * IC Engine (spec V3 §17) — statuts APPROVE / APPROVE_SUBJECT_TO_CONDITIONS
 * / RESTRUCTURE / HOLD / DECLINE, hard stops et conditions dérivés des
 * données déjà calculées (Lease Security, éligibilité, Sources=Uses, stress
 * COMBINED_SEVERE) plutôt qu'une nouvelle saisie. Calcule une
 * RECOMMANDATION — la décision elle-même (FractionalICDecision) est
 * enregistrée séparément par un utilisateur, qui peut la confirmer telle
 * quelle ou l'amender.
 */

export type ICDecisionStatus = 'APPROVE' | 'APPROVE_SUBJECT_TO_CONDITIONS' | 'RESTRUCTURE' | 'HOLD' | 'DECLINE';

export interface ICRecommendationInput {
  sourcesUsesBalanced: boolean;
  hasPlatformProfile: boolean;
  hasLeases: boolean;
  leaseAssessments: LeaseAssessment[];
  eligibility: EligibilityResult;
  combinedSevereScenario?: StressScenarioResult;
  /** Scénario DOWNSIDE du Break Event Engine (break-event.util.ts) — départ du locataire à sa prochaine échéance de break, pas un défaut immédiat comme TENANT_DEFAULT. */
  breakDownsideScenario?: StressScenarioResult;
  /**
   * Data Integrity (spec V2 §10 "Unknown ≠ Zero") — aucune ligne CapexItem
   * saisie pour ce dossier. capexByYear vaut alors {} dans le moteur de
   * rendement, indiscernable côté calcul d'un CAPEX confirmé à zéro : ce seul
   * champ permet à l'IC engine de le signaler explicitement au lieu de
   * laisser le cash-flow paraître non stressé sur ce poste sans explication.
   */
  capexDataMissing?: boolean;
  /** Data Confidence Engine (data-confidence.util.ts) — % de champs critiques du dossier vérifiés avec une confiance suffisante. */
  dataConfidencePct?: number;
  /**
   * CAPEX de mise en conformité ESG (esg-risk.util.ts, spec §12/§28) — null
   * si aucune classe DPE connue (aucune base de calcul, jamais un montant
   * deviné). Comparé à budgetedCapexTotal pour signaler un écart, jamais
   * injecté silencieusement dans le cash-flow (les lignes CapexItem restent
   * la seule source de vérité du CAPEX projeté).
   */
  esgCapexToComplyTotal?: number | null;
  /** Total CAPEX déjà budgété (capexByYear, tous horizons confondus). */
  budgetedCapexTotal?: number;
  /**
   * Data Integrity (spec §29.3/§26.31 "le moteur ne valide pas un hurdle net
   * si des frais obligatoires sont inconnus") — aucune FractionalFeeDefinition
   * saisie pour aucun stakeholder du dossier. Le Secured Net Yield affiché
   * (eligibility) n'intègre que le taux de gestion annuel du profil
   * plateforme (annualManagementFeePct) — jamais les frais d'entrée, de
   * structuration, de sortie ou le carry, modélisés séparément dans le Deal
   * Economics Engine (stakeholder-waterfall.util.ts). Sans aucune ligne de
   * frais saisie, le verdict d'éligibilité peut donc être optimiste sans que
   * rien ne le signale — jamais un hurdle validé en silence.
   */
  feeDataMissing?: boolean;
}

export interface ICRecommendation {
  status: ICDecisionStatus;
  hardStops: string[];
  conditions: string[];
  watchItems: string[];
  recommendation: string;
}

const EXCLUDED_LEASE_HARD_STOP_THRESHOLD_PCT = 20;
const DATA_CONFIDENCE_WATCH_THRESHOLD_PCT = 50;

export function computeICRecommendation(input: ICRecommendationInput): ICRecommendation {
  const hardStops: string[] = [];
  const conditions: string[] = [];
  const watchItems: string[] = [];

  if (!input.sourcesUsesBalanced) {
    hardStops.push('Sources ≠ Uses — le plan de financement doit être corrigé avant présentation.');
  }

  const excludedWeight = input.leaseAssessments.filter((a) => a.securityStatus === 'EXCLUDE_FROM_SECURED_YIELD').reduce((sum, a) => sum + a.weightPct, 0);
  if (excludedWeight >= EXCLUDED_LEASE_HARD_STOP_THRESHOLD_PCT) {
    hardStops.push(`${excludedWeight.toFixed(1)}% des loyers portés par des baux exclus du rendement sécurisé — nature ou statut à clarifier avant présentation.`);
  }

  for (const a of input.leaseAssessments.filter((x) => x.securityStatus === 'SECURE_BEFORE_ACQUISITION')) {
    conditions.push(`Sécuriser le bail de ${a.tenantName} (${a.weightPct.toFixed(1)}% des loyers) avant collecte/acquisition.`);
  }
  for (const a of input.leaseAssessments.filter((x) => x.securityStatus === 'WATCH')) {
    watchItems.push(`Bail de ${a.tenantName} à surveiller (échéance dans l'horizon de détention).`);
  }
  if (input.combinedSevereScenario && input.combinedSevereScenario.maxLoss > 0) {
    watchItems.push(`Scénario combiné sévère : perte de capital estimée à ${Math.round(input.combinedSevereScenario.maxLoss).toLocaleString('fr-FR')} €.`);
  }
  if (input.breakDownsideScenario && input.breakDownsideScenario.maxLoss > 0) {
    watchItems.push(
      `Départ locataire à la prochaine échéance de break (vacance + relocation) : perte de capital estimée à ${Math.round(input.breakDownsideScenario.maxLoss).toLocaleString('fr-FR')} €.`,
    );
  }
  if (input.capexDataMissing) {
    watchItems.push("CAPEX non renseigné (aucune ligne saisie) — donnée manquante, pas un CAPEX nul confirmé : le cash-flow n'est pas stressé sur ce poste.");
  }
  if (input.esgCapexToComplyTotal !== undefined && input.esgCapexToComplyTotal !== null && input.esgCapexToComplyTotal > (input.budgetedCapexTotal ?? 0)) {
    const gap = input.esgCapexToComplyTotal - (input.budgetedCapexTotal ?? 0);
    watchItems.push(
      `CAPEX de mise en conformité ESG estimé à ${Math.round(input.esgCapexToComplyTotal).toLocaleString('fr-FR')} € (onglet Risque ESG) — ${Math.round(gap).toLocaleString('fr-FR')} € de plus que le CAPEX actuellement budgété.`,
    );
  }
  if (input.feeDataMissing) {
    watchItems.push(
      "Aucun frais stakeholder renseigné (onglet Deal Economics) — le Secured Net Yield affiché n'intègre que le taux de gestion du profil plateforme, jamais les frais d'entrée, de structuration, de sortie ou le carry : le hurdle validé ci-dessus peut être optimiste.",
    );
  }
  if (input.dataConfidencePct !== undefined && input.dataConfidencePct < DATA_CONFIDENCE_WATCH_THRESHOLD_PCT) {
    watchItems.push(
      `Confiance data faible (${input.dataConfidencePct}/100) — plusieurs champs critiques (loyer, dates de bail, prix) ne sont pas encore sourcés ou vérifiés ; les rendements affichés sont à confirmer avant présentation.`,
    );
  }

  let status: ICDecisionStatus;
  let recommendation: string;

  if (hardStops.length > 0) {
    status = 'DECLINE';
    recommendation = 'Hard stop actif — dossier non présentable en l\'état.';
  } else if (input.eligibility.verdict === 'NOT_EVALUABLE') {
    status = 'HOLD';
    recommendation = 'Collecte non renseignée (Sources & Uses) — rendement sécurisé non évaluable, hurdle non vérifiable.';
  } else if (input.eligibility.verdict === 'INELIGIBLE') {
    status = 'DECLINE';
    recommendation = 'Rendement sécurisé sous le hurdle plateforme — profil risque/rendement incompatible.';
  } else if (!input.hasPlatformProfile || !input.hasLeases) {
    status = 'HOLD';
    recommendation = 'Informations critiques manquantes (profil plateforme ou rent roll) — hurdle non évaluable.';
  } else if (conditions.length > 0) {
    status = 'APPROVE_SUBJECT_TO_CONDITIONS';
    recommendation = 'Éligible sous réserve de sécuriser les baux matériels listés en conditions.';
  } else if (input.eligibility.verdict === 'MARGINAL') {
    status = 'RESTRUCTURE';
    recommendation = 'Rendement trop proche du hurdle — revoir prix, frais ou waterfall avant présentation.';
  } else {
    status = 'APPROVE';
    recommendation = 'Critères satisfaits, pas de condition matérielle ouverte.';
  }

  return { status, hardStops, conditions, watchItems, recommendation };
}
