import { GuaranteeType } from '@prisma/client';

export type GuaranteeValidity = 'VALIDE' | 'NON_VALIDE';

export interface GuaranteeExpiry {
  validity: GuaranteeValidity;
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
 */
export function computeGuaranteeExpiry(
  type: GuaranteeType,
  endDate: Date | null | undefined,
  now: Date = new Date(),
): GuaranteeExpiry {
  if (!isExpirableGuaranteeType(type) || !endDate) {
    return { validity: 'VALIDE', expiringSoon: false, daysToExpiry: null };
  }

  const daysToExpiry = Math.ceil((endDate.getTime() - now.getTime()) / 86_400_000);
  if (daysToExpiry <= 0) {
    return { validity: 'NON_VALIDE', expiringSoon: false, daysToExpiry };
  }

  return { validity: 'VALIDE', expiringSoon: daysToExpiry <= WARNING_WINDOW_DAYS, daysToExpiry };
}
