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
}

export interface ICRecommendation {
  status: ICDecisionStatus;
  hardStops: string[];
  conditions: string[];
  watchItems: string[];
  recommendation: string;
}

const EXCLUDED_LEASE_HARD_STOP_THRESHOLD_PCT = 20;

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

  let status: ICDecisionStatus;
  let recommendation: string;

  if (hardStops.length > 0) {
    status = 'DECLINE';
    recommendation = 'Hard stop actif — dossier non présentable en l\'état.';
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
