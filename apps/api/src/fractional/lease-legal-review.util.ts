import type { FractionalLeaseRenewalStatus } from '@prisma/client';

/**
 * Module juridique — recommandations de qualité des baux. Complète le
 * Lease Security Engine (qui répond "quel revenu est sécurisé ?") par une
 * checklist actionnable à destination du juridique/gestion locative
 * ("qu'est-ce qu'il faut faire sur ce bail ?") : échéance proche,
 * renouvellement non formalisé, procédure collective, garanties
 * insuffisantes, clauses non renseignées. Calculé à la volée à partir des
 * champs bruts du bail, jamais stocké — même doctrine que
 * tenant-covenant.util.ts et lease-security.util.ts.
 */

export type LegalRecommendationSeverity = 'INFO' | 'WATCH' | 'ALERT' | 'CRITIQUE';

const SEVERITY_ORDER: LegalRecommendationSeverity[] = ['INFO', 'WATCH', 'ALERT', 'CRITIQUE'];

export interface LegalRecommendation {
  code: string;
  severity: LegalRecommendationSeverity;
  message: string;
}

export interface LeaseLegalReviewInput {
  dateEffet: Date;
  dateTerme: Date;
  breakDates: Date[];
  statutRenouvellement: FractionalLeaseRenewalStatus;
  procedureCollective: boolean;
  impayesNotes: string | null;
  depotGarantieMontant: number | null;
  loyerFacialAnnuel: number;
  restrictionsCessionSousLocation: string | null;
  repartitionTravaux: string | null;
  sirenLocataire: string | null;
}

export interface LeaseLegalReviewResult {
  recommendations: LegalRecommendation[];
  worstSeverity: LegalRecommendationSeverity;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

function nextBreakOrTerm(input: LeaseLegalReviewInput, asOfDate: Date): { date: Date; isBreak: boolean } {
  const futureBreaks = input.breakDates.filter((d) => d.getTime() > asOfDate.getTime()).sort((a, b) => a.getTime() - b.getTime());
  return futureBreaks.length > 0 ? { date: futureBreaks[0], isBreak: true } : { date: input.dateTerme, isBreak: false };
}

const EXPIRY_ALERT_MONTHS = 12;
const EXPIRY_WATCH_MONTHS = 24;
const BREAK_ALERT_MONTHS = 12;
const MIN_DEPOSIT_MONTHS_RENT = 1;

export function computeLeaseLegalReview(input: LeaseLegalReviewInput, asOfDate: Date): LeaseLegalReviewResult {
  const recommendations: LegalRecommendation[] = [];
  const { date: breakOrTerm, isBreak } = nextBreakOrTerm(input, asOfDate);
  const monthsToExpiry = monthsBetween(asOfDate, breakOrTerm);
  const yearsToExpiry = monthsToExpiry / 12;

  if (monthsToExpiry <= 0) {
    recommendations.push({
      code: 'EXPIRY_PASSED',
      severity: 'CRITIQUE',
      message: `Échéance ${isBreak ? "d'option de sortie (break)" : 'contractuelle'} déjà dépassée — situation à régulariser en priorité`,
    });
  } else if (monthsToExpiry <= EXPIRY_ALERT_MONTHS) {
    recommendations.push({
      code: 'EXPIRY_IMMINENT',
      severity: 'ALERT',
      message: `Échéance ${isBreak ? 'de break' : 'du bail'} dans moins de 12 mois (${monthsToExpiry.toFixed(0)} mois) — engager la négociation de renouvellement sans délai`,
    });
  } else if (monthsToExpiry <= EXPIRY_WATCH_MONTHS) {
    recommendations.push({
      code: 'EXPIRY_APPROACHING',
      severity: 'WATCH',
      message: `${yearsToExpiry.toFixed(1)} année(s) restante(s) avant ${isBreak ? 'la prochaine option de sortie' : 'le terme'} — bail à surveiller pour anticiper le renouvellement`,
    });
  }

  if (isBreak && monthsToExpiry > 0 && monthsToExpiry <= BREAK_ALERT_MONTHS) {
    recommendations.push({
      code: 'BREAK_OPTION_IMMINENT',
      severity: 'ALERT',
      message: `Option de sortie (break) activable par le locataire dans moins de 12 mois — anticiper le risque de départ`,
    });
  }

  switch (input.statutRenouvellement) {
    case 'CONTESTE':
      recommendations.push({ code: 'RENEWAL_CONTESTED', severity: 'CRITIQUE', message: 'Renouvellement contesté — litige en cours, sécurité juridique du bail compromise' });
      break;
    case 'DEPASSE':
      recommendations.push({ code: 'RENEWAL_OVERDUE', severity: 'CRITIQUE', message: 'Renouvellement dépassé sans régularisation — bail juridiquement fragile' });
      break;
    case 'EN_COURS':
      recommendations.push({ code: 'RENEWAL_IN_PROGRESS', severity: 'WATCH', message: 'Renouvellement en cours de négociation — bail non encore formalisé' });
      break;
    case 'TACITE':
      recommendations.push({ code: 'RENEWAL_TACIT', severity: 'WATCH', message: 'Bail en tacite reconduction — non formalisé par avenant écrit, à régulariser' });
      break;
    case 'SIGNE':
      break;
  }

  if (input.procedureCollective) {
    recommendations.push({
      code: 'INSOLVENCY_PROCEEDING',
      severity: 'CRITIQUE',
      message: 'Procédure collective en cours chez le locataire — risque de résiliation judiciaire du bail',
    });
  }

  if (input.impayesNotes && input.impayesNotes.trim().length > 0) {
    recommendations.push({
      code: 'UNPAID_RENT_HISTORY',
      severity: 'ALERT',
      message: "Historique d'impayés documenté — vérifier les procédures de recouvrement et de mise en demeure en cours",
    });
  }

  const depositMonths = input.depotGarantieMontant !== null && input.loyerFacialAnnuel > 0 ? input.depotGarantieMontant / (input.loyerFacialAnnuel / 12) : null;
  if (input.depotGarantieMontant === null) {
    recommendations.push({ code: 'NO_SECURITY_DEPOSIT', severity: 'WATCH', message: 'Aucun dépôt de garantie renseigné — protection juridique limitée en cas d\'impayé' });
  } else if (depositMonths !== null && depositMonths < MIN_DEPOSIT_MONTHS_RENT) {
    recommendations.push({ code: 'LOW_SECURITY_DEPOSIT', severity: 'WATCH', message: `Dépôt de garantie inférieur à 1 mois de loyer (${depositMonths.toFixed(1)} mois) — protection limitée en cas d'impayé` });
  }

  if (!input.restrictionsCessionSousLocation || input.restrictionsCessionSousLocation.trim().length === 0) {
    recommendations.push({ code: 'NO_ASSIGNMENT_CLAUSE', severity: 'INFO', message: 'Clause de cession/sous-location non renseignée — à vérifier dans l\'acte' });
  }

  if (!input.repartitionTravaux || input.repartitionTravaux.trim().length === 0) {
    recommendations.push({ code: 'NO_WORKS_ALLOCATION', severity: 'INFO', message: 'Répartition des travaux (grosses réparations, art. 606 C. civ.) non renseignée — à vérifier dans le bail' });
  }

  if (!input.sirenLocataire) {
    recommendations.push({ code: 'NO_TENANT_SIREN', severity: 'INFO', message: 'SIREN du locataire non renseigné — identité juridique non vérifiable' });
  }

  const worstSeverity = recommendations.reduce<LegalRecommendationSeverity>(
    (worst, r) => (SEVERITY_ORDER.indexOf(r.severity) > SEVERITY_ORDER.indexOf(worst) ? r.severity : worst),
    'INFO',
  );

  return { recommendations, worstSeverity };
}
