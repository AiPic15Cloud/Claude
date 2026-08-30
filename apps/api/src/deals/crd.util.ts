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
