import type { FractionalLeaseRenewalStatus } from '@prisma/client';

/**
 * Lease Audit & Lease Security Engine (spec V3 §7). Détermine bail par bail
 * quelle part du revenu est réellement sécurisée sur l'horizon de détention,
 * pas seulement ce que dit le bail — cf. §7.2 "un bail de 18 mois
 * représentant 2% des loyers ne reçoit pas le même traitement qu'un bail de
 * 18 mois représentant 25%".
 *
 * Règle de matérialité retenue pour ce premier lot (P0) — poids du loyer +
 * durée restante + statut de renouvellement, les 4 autres facteurs cités par
 * la spec (covenant, mark-to-market, coût de relocation) relèvent du Tenant
 * Covenant Engine, explicitement P1 :
 *
 * 1. Statut DEPASSE/CONTESTE, ou échéance déjà passée → EXCLUDE_FROM_SECURED_YIELD
 *    (revenu non suffisamment démontré, spec §7.2).
 * 2. Poids ≥ MATERIALITY_THRESHOLD_PCT ET échéance < horizon de détention :
 *    - statut SIGNE → WATCH (échéance gérable mais à surveiller sur un bail matériel)
 *    - statut EN_COURS/TACITE → SECURE_BEFORE_ACQUISITION (matériel + non formalisé)
 * 3. Échéance < horizon de détention (poids faible) → WATCH.
 * 4. Sinon → SECURED.
 *
 * Seuil de matérialité et horizon par défaut sont des paramètres explicites
 * (jamais des constantes cachées) — à calibrer par plateforme/projet une
 * fois de vraies données de recette disponibles.
 */

export const DEFAULT_MATERIALITY_THRESHOLD_PCT = 5;
export const DEFAULT_HOLD_PERIOD_MONTHS = 60;

export type LeaseSecurityStatus = 'SECURED' | 'WATCH' | 'SECURE_BEFORE_ACQUISITION' | 'EXCLUDE_FROM_SECURED_YIELD';

export interface LeaseInput {
  id: string;
  tenantName: string;
  loyerFacialAnnuel: number;
  dateEffet: Date;
  dateTerme: Date;
  breakDates: Date[];
  statutRenouvellement: FractionalLeaseRenewalStatus;
}

export interface LeaseAssessment {
  leaseId: string;
  tenantName: string;
  weightPct: number;
  monthsToNextBreakOrTerm: number;
  securityStatus: LeaseSecurityStatus;
  reasons: string[];
}

export interface LeaseSecurityInput {
  leases: LeaseInput[];
  asOfDate: Date;
  holdPeriodMonths?: number;
  materialityThresholdPct?: number;
}

export interface LeaseSecurityResult {
  assessments: LeaseAssessment[];
  walbYears: number | null;
  waltYears: number | null;
  totalLoyerFacial: number;
  securedRentPct: number;
  /** loyer non sécurisé (WATCH exclu — WATCH reste compté dans le sécurisé, seuls SECURE_BEFORE_ACQUISITION/EXCLUDE en sont retirés) */
  rentAtRiskPct: number;
  expiryWallByYear: Record<number, number>;
}

function monthsBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / (1000 * 60 * 60 * 24 * 30.4375);
}

function nextBreakOrTerm(lease: LeaseInput, asOfDate: Date): Date {
  const futureBreaks = lease.breakDates.filter((d) => d.getTime() > asOfDate.getTime()).sort((a, b) => a.getTime() - b.getTime());
  return futureBreaks.length > 0 ? futureBreaks[0] : lease.dateTerme;
}

function assessLease(
  lease: LeaseInput,
  asOfDate: Date,
  weightPct: number,
  holdPeriodMonths: number,
  materialityThresholdPct: number,
): LeaseAssessment {
  const breakOrTerm = nextBreakOrTerm(lease, asOfDate);
  const monthsToNextBreakOrTerm = monthsBetween(asOfDate, breakOrTerm);
  const reasons: string[] = [];

  if (lease.statutRenouvellement === 'DEPASSE' || lease.statutRenouvellement === 'CONTESTE') {
    reasons.push(`Statut de renouvellement ${lease.statutRenouvellement.toLowerCase()} — revenu non suffisamment démontré`);
    return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'EXCLUDE_FROM_SECURED_YIELD', reasons };
  }
  if (monthsToNextBreakOrTerm <= 0) {
    reasons.push('Échéance contractuelle (bail ou break) déjà dépassée');
    return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'EXCLUDE_FROM_SECURED_YIELD', reasons };
  }

  const isMaterial = weightPct >= materialityThresholdPct;
  const withinHoldPeriod = monthsToNextBreakOrTerm < holdPeriodMonths;

  if (isMaterial && withinHoldPeriod) {
    if (lease.statutRenouvellement === 'SIGNE') {
      reasons.push(`Bail matériel (${weightPct.toFixed(1)}% des loyers) avec échéance dans l'horizon de détention`);
      return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'WATCH', reasons };
    }
    reasons.push(`Bail matériel (${weightPct.toFixed(1)}% des loyers), renouvellement non signé (${lease.statutRenouvellement.toLowerCase()}), échéance dans l'horizon de détention`);
    return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'SECURE_BEFORE_ACQUISITION', reasons };
  }

  if (withinHoldPeriod) {
    reasons.push('Échéance dans l\'horizon de détention (poids limité)');
    return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'WATCH', reasons };
  }

  reasons.push('Durée résiduelle compatible avec l\'horizon de détention');
  return { leaseId: lease.id, tenantName: lease.tenantName, weightPct, monthsToNextBreakOrTerm, securityStatus: 'SECURED', reasons };
}

export function computeLeaseSecurity(input: LeaseSecurityInput): LeaseSecurityResult {
  const holdPeriodMonths = input.holdPeriodMonths ?? DEFAULT_HOLD_PERIOD_MONTHS;
  const materialityThresholdPct = input.materialityThresholdPct ?? DEFAULT_MATERIALITY_THRESHOLD_PCT;
  const totalLoyerFacial = input.leases.reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);

  const assessments = input.leases.map((lease) => {
    const weightPct = totalLoyerFacial > 0 ? (lease.loyerFacialAnnuel / totalLoyerFacial) * 100 : 0;
    return assessLease(lease, input.asOfDate, weightPct, holdPeriodMonths, materialityThresholdPct);
  });

  // WALB/WALT pondérés par loyer — WALB = prochaine rupture possible, WALT = terme contractuel.
  let walbNumerator = 0;
  let waltNumerator = 0;
  for (const lease of input.leases) {
    const breakOrTerm = nextBreakOrTerm(lease, input.asOfDate);
    walbNumerator += lease.loyerFacialAnnuel * (monthsBetween(input.asOfDate, breakOrTerm) / 12);
    waltNumerator += lease.loyerFacialAnnuel * (monthsBetween(input.asOfDate, lease.dateTerme) / 12);
  }
  const walbYears = totalLoyerFacial > 0 ? walbNumerator / totalLoyerFacial : null;
  const waltYears = totalLoyerFacial > 0 ? waltNumerator / totalLoyerFacial : null;

  const securedLoyer = assessments
    .filter((a) => a.securityStatus === 'SECURED' || a.securityStatus === 'WATCH')
    .reduce((sum, a) => sum + (input.leases.find((l) => l.id === a.leaseId)?.loyerFacialAnnuel ?? 0), 0);
  const securedRentPct = totalLoyerFacial > 0 ? (securedLoyer / totalLoyerFacial) * 100 : 0;

  const expiryWallByYear: Record<number, number> = {};
  for (const lease of input.leases) {
    const breakOrTerm = nextBreakOrTerm(lease, input.asOfDate);
    const year = breakOrTerm.getFullYear();
    const pct = totalLoyerFacial > 0 ? (lease.loyerFacialAnnuel / totalLoyerFacial) * 100 : 0;
    expiryWallByYear[year] = (expiryWallByYear[year] ?? 0) + pct;
  }

  return {
    assessments,
    walbYears,
    waltYears,
    totalLoyerFacial,
    securedRentPct,
    rentAtRiskPct: 100 - securedRentPct,
    expiryWallByYear,
  };
}

/** Somme des loyers des baux dont le statut de sécurisation figure dans `statuses` — utilisé pour isoler le NOI "sécurisé" du NOI brut (returns.util.ts). */
export function sumLoyerByStatuses(leases: LeaseInput[], assessments: LeaseAssessment[], statuses: LeaseSecurityStatus[]): number {
  const included = new Set(assessments.filter((a) => statuses.includes(a.securityStatus)).map((a) => a.leaseId));
  return leases.filter((l) => included.has(l.id)).reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);
}

/** Secured Rent à un horizon donné (12m/3y/5y, spec §7.1) : loyer des baux dont la prochaine échéance/break dépasse l'horizon, hors baux exclus. */
export function computeSecuredRentAtHorizon(input: LeaseSecurityInput, horizonMonths: number): number {
  const holdPeriodMonths = input.holdPeriodMonths ?? DEFAULT_HOLD_PERIOD_MONTHS;
  const materialityThresholdPct = input.materialityThresholdPct ?? DEFAULT_MATERIALITY_THRESHOLD_PCT;
  const totalLoyerFacial = input.leases.reduce((sum, l) => sum + l.loyerFacialAnnuel, 0);

  return input.leases.reduce((sum, lease) => {
    const weightPct = totalLoyerFacial > 0 ? (lease.loyerFacialAnnuel / totalLoyerFacial) * 100 : 0;
    const assessment = assessLease(lease, input.asOfDate, weightPct, holdPeriodMonths, materialityThresholdPct);
    if (assessment.securityStatus === 'EXCLUDE_FROM_SECURED_YIELD' || assessment.securityStatus === 'SECURE_BEFORE_ACQUISITION') return sum;
    const breakOrTerm = nextBreakOrTerm(lease, input.asOfDate);
    const survivesHorizon = monthsBetween(input.asOfDate, breakOrTerm) >= horizonMonths;
    return survivesHorizon ? sum + lease.loyerFacialAnnuel : sum;
  }, 0);
}
