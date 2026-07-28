export type NewsletterStatus = 'A_JOUR' | 'A_RELANCER' | 'CRITIQUE';

export interface NewsletterFollowUp {
  daysSince: number | null;
  status: NewsletterStatus;
}

const DAY_MS = 86_400_000;

/**
 * Investor newsletter follow-up cadence: within the deal's own target
 * (newsletterTargetDays, 45 by default) is fine, up to 15 days past it
 * needs a relaunch, further than that is critical. A deal with no NL on
 * record yet is treated as critical — there's nothing to reassure on.
 */
export function computeNewsletterStatus(
  lastNewsletterDate: Date | null | undefined,
  targetDays = 45,
  now: Date = new Date(),
): NewsletterFollowUp {
  if (!lastNewsletterDate) {
    return { daysSince: null, status: 'CRITIQUE' };
  }
  const daysSince = Math.floor((now.getTime() - lastNewsletterDate.getTime()) / DAY_MS);
  if (daysSince <= targetDays) return { daysSince, status: 'A_JOUR' };
  if (daysSince <= targetDays + 15) return { daysSince, status: 'A_RELANCER' };
  return { daysSince, status: 'CRITIQUE' };
}
