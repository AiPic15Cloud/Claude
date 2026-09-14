const DAY_MS = 86_400_000;

/**
 * Suivi du paiement mensuel des intérêts (Deal.repaymentMode = MENSUEL,
 * Deal.interestPaymentDay) — demande explicite : pouvoir indiquer si un
 * dossier est en paiement mensuel ou in fine, et si mensuel, la date
 * d'échéance des intérêts et être notifié quand le paiement n'est pas
 * réalisé à date. Consommé par interest-payment-alerts.service.ts, qui
 * suit exactement le pattern de deadline-alerts.service.ts (moteur pur +
 * service périodique idempotent).
 *
 * GRACE_DAYS : tolérance avant de considérer un paiement en retard — les
 * virements bancaires n'arrivent pas toujours jour pour jour, une alerte
 * dès J+0 générerait trop de faux positifs.
 */
export const INTEREST_PAYMENT_GRACE_DAYS = 3;

export type InterestPaymentLevel = 'RAS' | 'DUE_SOON' | 'OVERDUE';

export interface InterestPaymentStatus {
  /** Échéance du cycle en cours — le jour interestPaymentDay du mois le plus récent déjà entamé. */
  currentDueDate: Date;
  daysOverdue: number;
  level: InterestPaymentLevel;
}

/**
 * Jour d'échéance du cycle en cours (le plus récent <= asOfDate), avec le
 * jour du mois ajusté au dernier jour du mois si celui-ci est plus court
 * (ex. jour 31 en février -> 28/29 février) — jamais un jour au-delà de la
 * fin du mois, jamais un débordement silencieux sur le mois suivant.
 */
export function resolveCurrentInterestDueDate(interestPaymentDay: number, asOfDate: Date): Date {
  const clampToMonth = (year: number, monthIndex0: number): Date => {
    const lastDayOfMonth = new Date(year, monthIndex0 + 1, 0).getDate();
    return new Date(year, monthIndex0, Math.min(interestPaymentDay, lastDayOfMonth));
  };

  const thisMonthDue = clampToMonth(asOfDate.getFullYear(), asOfDate.getMonth());
  if (thisMonthDue.getTime() <= asOfDate.getTime()) return thisMonthDue;

  // Le jour d'échéance de ce mois n'est pas encore atteint : le cycle en
  // cours est celui du mois précédent.
  const prevMonthIndex0 = asOfDate.getMonth() - 1;
  const prevYear = prevMonthIndex0 < 0 ? asOfDate.getFullYear() - 1 : asOfDate.getFullYear();
  return clampToMonth(prevYear, (prevMonthIndex0 + 12) % 12);
}

/**
 * lastPaymentDate : date du paiement d'intérêts le plus récent constaté
 * pour ce deal (InterestPayment.paidDate le plus récent), ou null si aucun
 * n'a jamais été enregistré. Un paiement couvre le cycle en cours dès lors
 * qu'il est daté à partir de l'échéance de ce cycle — jamais présumé payé
 * en l'absence de tout enregistrement (Unknown ≠ Zero).
 */
export function computeInterestPaymentStatus(interestPaymentDay: number, lastPaymentDate: Date | null, asOfDate: Date): InterestPaymentStatus {
  const currentDueDate = resolveCurrentInterestDueDate(interestPaymentDay, asOfDate);
  const paidForCurrentCycle = lastPaymentDate !== null && lastPaymentDate.getTime() >= currentDueDate.getTime();

  if (paidForCurrentCycle) return { currentDueDate, daysOverdue: 0, level: 'RAS' };

  const daysOverdue = Math.max(0, Math.floor((asOfDate.getTime() - currentDueDate.getTime()) / DAY_MS));
  if (daysOverdue === 0) return { currentDueDate, daysOverdue: 0, level: 'RAS' };
  if (daysOverdue <= INTEREST_PAYMENT_GRACE_DAYS) return { currentDueDate, daysOverdue, level: 'DUE_SOON' };
  return { currentDueDate, daysOverdue, level: 'OVERDUE' };
}
