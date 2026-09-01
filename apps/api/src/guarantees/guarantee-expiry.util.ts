import { GuaranteeType } from '@prisma/client';

export type GuaranteeValidity = 'VALIDE' | 'NON_VALIDE';

/** Pourquoi une sûreté est NON_VALIDE (spec ATLAS v2, A.9) — purement informatif, n'affecte aucun consommateur existant du booléen validity. */
export type GuaranteeInvalidReason = 'EXPIREE' | 'DEFAUT_DE_FOND' | null;

export interface GuaranteeExpiry {
  validity: GuaranteeValidity;
  invalidReason: GuaranteeInvalidReason;
  // null when there's no endDate to warn about, or the type doesn't carry
  // a renewal deadline (only HYPOTHEQUE / FIDUCIE / CAUTION do).
  expiringSoon: boolean;
  daysToExpiry: number | null;
}

// Only these three guarantee types carry a renewal deadline — a gage or
// nantissement doesn't expire the same way a mortgage/fiducie/caution term
// does, so endDate is meaningless for them even if one were entered.
const EXPIRABLE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION'];

const WARNING_WINDOW_DAYS = 182; // ~6 months

export function isExpirableGuaranteeType(type: GuaranteeType): boolean {
  return EXPIRABLE_TYPES.includes(type);
}

/**
 * Derives validity + renewal warning from a guarantee's end date — nothing
 * here is persisted, it's recomputed on every read (same pattern as
 * computeDeadlineAlert / computeCheckpointHealth for deals).
 *
 * `suppressed` covers a repaid or defaulted (stage DEFAUT) deal: renewing a
 * guarantee is a decision about a deal still being worked, so once the
 * deal itself is closed out there's nothing left to prompt regardless of
 * the calendar date — same closed-deal condition as isDealClosed().
 *
 * `hasSubstantiveDefect` (spec ATLAS v2, A.9) — un vice de fond constaté par
 * un analyste (Guarantee.substantiveDefect) rend la sûreté NON_VALIDE même
 * si endDate est encore dans le futur : un défaut juridique n'attend pas le
 * calendrier. Priorité : suppressed > défaut de fond > date.
 */
export function computeGuaranteeExpiry(
  type: GuaranteeType,
  endDate: Date | null | undefined,
  hasSubstantiveDefect = false,
  now: Date = new Date(),
  suppressed = false,
): GuaranteeExpiry {
  if (suppressed) {
    return { validity: 'VALIDE', invalidReason: null, expiringSoon: false, daysToExpiry: null };
  }

  if (hasSubstantiveDefect) {
    const daysToExpiry = endDate ? Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000) : null;
    return { validity: 'NON_VALIDE', invalidReason: 'DEFAUT_DE_FOND', expiringSoon: false, daysToExpiry };
  }

  if (!isExpirableGuaranteeType(type) || !endDate) {
    return { validity: 'VALIDE', invalidReason: null, expiringSoon: false, daysToExpiry: null };
  }

  const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000);
  if (daysToExpiry <= 0) {
    return { validity: 'NON_VALIDE', invalidReason: 'EXPIREE', expiringSoon: false, daysToExpiry };
  }

  return { validity: 'VALIDE', invalidReason: null, expiringSoon: daysToExpiry <= WARNING_WINDOW_DAYS, daysToExpiry };
}
