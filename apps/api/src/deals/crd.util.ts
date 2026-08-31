/**
 * Le CRD (capital restant dû) n'est jamais stocké — comme computeDeadlineAlert
 * ou computeCheckpointHealth, c'est une valeur calculée à partir de champs
 * déjà persistés (Deal.amountRaised + Repayment), jamais dupliquée en base.
 *
 * Hypothèse explicite : Repayment n'a pas de ventilation principal/intérêts
 * (un seul champ `amount`), donc chaque remboursement réalisé (projected:
 * false) est traité comme réduisant le capital emprunté à due concurrence.
 * Les remboursements prévisionnels (projected: true) ne sont jamais déduits :
 * ce sont des prévisions, pas des faits.
 */
export const CRD_ASSUMPTION_DISCLAIMER =
  "Le CRD suppose que chaque remboursement réalisé (non projeté) réduit le capital emprunté d'autant — " +
  'Repayment ne distingue pas principal et intérêts aujourd\'hui. Les remboursements projetés ne sont jamais déduits.';

export function sumRealizedRepayments(repayments: { amount: number | { toString(): string }; projected: boolean }[]): number {
  return repayments.filter((r) => !r.projected).reduce((sum, r) => sum + Number(r.amount), 0);
}

export function computeCrd(amountRaised: number, realizedRepaymentsTotal: number): number {
  return Math.max(0, amountRaised - realizedRepaymentsTotal);
}

export interface CrdDetailedResult {
  crdCapital: number;
  /** null quand le taux ou la date de départ manquent — jamais fabriqué à 0 %, qui serait une fausse précision. */
  crdInteretsCourus: number | null;
  crdTotal: number | null;
}

/**
 * CRD avec intérêts courus (spec ATLAS v2, A.3ter — formule complète).
 * Contrairement à computeCrd() (capital seul, réservé aux agrégations
 * portefeuille où la précision par dossier importe moins), cette version
 * ventile chaque remboursement réalisé entre part intérêts et part capital
 * avant de réduire le capital restant dû — utilisée sur la fiche dossier
 * individuelle, où la précision compte.
 *
 * Méthode retenue, faute de tableau d'amortissement contractuel stocké en
 * base (Deal ne porte qu'un taux annuel fixe) : intérêts simples au prorata
 * du nombre de jours écoulés sur le capital restant dû (taux annuel × jours
 * / 365), imputés en priorité sur chaque remboursement avant le capital —
 * ordre légal par défaut à défaut de stipulation contraire (art. 1342-10 du
 * Code civil). Ceci n'est pas un conseil juridique ; le mode d'imputation
 * retenu doit rester documenté et vérifiable dossier par dossier, et
 * confirmé si les conditions contractuelles réelles diffèrent.
 */
export function computeCrdDetailed(
  amountRaised: number,
  interestRatePct: number | null | undefined,
  startDate: Date | null | undefined,
  realizedRepayments: { date: Date; amount: number }[],
  now: Date = new Date(),
): CrdDetailedResult {
  const sorted = [...realizedRepayments].sort((a, b) => a.date.getTime() - b.date.getTime());
  const totalRepaid = sorted.reduce((sum, r) => sum + r.amount, 0);

  if (!interestRatePct || !startDate) {
    return { crdCapital: computeCrd(amountRaised, totalRepaid), crdInteretsCourus: null, crdTotal: null };
  }

  const DAY_MS = 86_400_000;
  const YEAR_DAYS = 365;
  let outstanding = amountRaised;
  let lastEventDate = startDate;

  for (const repayment of sorted) {
    const daysElapsed = Math.max(0, (repayment.date.getTime() - lastEventDate.getTime()) / DAY_MS);
    const interestAccrued = outstanding * (interestRatePct / 100) * (daysElapsed / YEAR_DAYS);
    const partInterets = Math.min(repayment.amount, interestAccrued);
    const partCapital = repayment.amount - partInterets;
    outstanding = Math.max(0, outstanding - partCapital);
    lastEventDate = repayment.date;
  }

  const daysSinceLastEvent = Math.max(0, (now.getTime() - lastEventDate.getTime()) / DAY_MS);
  const crdInteretsCourus = outstanding * (interestRatePct / 100) * (daysSinceLastEvent / YEAR_DAYS);

  return { crdCapital: outstanding, crdInteretsCourus, crdTotal: outstanding + crdInteretsCourus };
}
