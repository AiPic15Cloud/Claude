export type NewsletterStatus = 'A_JOUR' | 'A_RELANCER' | 'CRITIQUE';

export interface NewsletterFollowUp {
  daysSince: number | null;
  status: NewsletterStatus;
}

const DAY_MS = 86_400_000;

/**
 * Investor newsletter follow-up cadence: 0-30 days since the last NL is
 * fine, 30-50 needs a relaunch, past 50 is critical. A deal with no NL on
 * record yet is treated as critical — there's nothing to reassure on.
 */
export function computeNewsletterStatus(lastNewsletterDate: Date | null | undefined, now: Date = new Date()): NewsletterFollowUp {
  if (!lastNewsletterDate) {
    return { daysSince: null, status: 'CRITIQUE' };
  }
  const daysSince = Math.floor((now.getTime() - lastNewsletterDate.getTime()) / DAY_MS);
  if (daysSince <= 30) return { daysSince, status: 'A_JOUR' };
  if (daysSince <= 50) return { daysSince, status: 'A_RELANCER' };
  return { daysSince, status: 'CRITIQUE' };
}
