const DAY_MS = 86_400_000;

/** Fenêtre usuelle par défaut — à valider avec un avocat spécialisé procédures collectives (ceci n'est pas un conseil juridique, voir procedure-collective.playbook.ts). */
export const PERIODE_SUSPECTE_WINDOW_MONTHS = 18;

/**
 * Période suspecte (spec ATLAS v2, A.9 / A.4) — une sûreté prise ou
 * renouvelée dans les mois précédant l'ouverture d'une procédure collective
 * peut être annulée à ce titre. `guaranteeDate` doit être antérieure à
 * `anchorDate` pour être "suspecte" — une sûreté postérieure à l'ouverture
 * n'entre pas dans ce cas de figure.
 */
export function isDansPeriodeSuspecte(
  guaranteeDate: Date,
  anchorDate: Date,
  windowMonths = PERIODE_SUSPECTE_WINDOW_MONTHS,
): boolean {
  if (guaranteeDate.getTime() > anchorDate.getTime()) return false;
  const windowStart = new Date(anchorDate);
  windowStart.setMonth(windowStart.getMonth() - windowMonths);
  return guaranteeDate.getTime() >= windowStart.getTime();
}
