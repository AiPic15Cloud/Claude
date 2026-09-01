import { computePostEcheanceSegments } from './loan-lifecycle.util';

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

/** Points de pourcentage ajoutés au taux contractuel pour toute journée d'intérêts courue en dehors du contrat (au-delà de l'échéance actuelle, avant régularisation par prorogation). */
export const LATE_PAYMENT_PENALTY_PCT = 5;

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
  /**
   * Nombre de jours d'intérêts courus calculés au taux majoré de pénalité de
   * retard (+ LATE_PAYMENT_PENALTY_PCT), toutes périodes confondues depuis le
   * déblocage des fonds. 0 si le dossier n'a jamais été hors-contrat ; null si
   * l'échéance contractuelle n'est pas connue — la pénalité n'est alors pas
   * calculable, jamais fabriquée à 0.
   */
  joursPenalisesRetard: number | null;
}

export interface LateInterestInput {
  /** Échéance contractuelle d'origine — cf. Deal.dateEcheanceInitiale (ou endDate en repli). */
  dateEcheanceInitiale: Date | null | undefined;
  /** Doit déjà être triée par dateSignature croissante. */
  extensions: { dateSignature: Date; nouvelleDateEcheance: Date }[];
}

const DAY_MS = 86_400_000;
const YEAR_DAYS = 365;

/** Jours de l'intervalle [from, to) qui tombent dans un segment hors-contrat. */
function horsContratDaysBetween(from: Date, to: Date, horsContratSegments: { start: Date; end: Date }[]): number {
  let days = 0;
  for (const seg of horsContratSegments) {
    const overlapStart = Math.max(from.getTime(), seg.start.getTime());
    const overlapEnd = Math.min(to.getTime(), seg.end.getTime());
    if (overlapEnd > overlapStart) days += (overlapEnd - overlapStart) / DAY_MS;
  }
  return days;
}

/**
 * Intérêts simples courus sur `outstanding` entre `from` et `to`, au taux
 * contractuel — sauf sur les jours qui tombent dans un segment hors-contrat
 * (au-delà de l'échéance actuelle, avant régularisation par prorogation),
 * où le taux est majoré de LATE_PAYMENT_PENALTY_PCT points. Retourne aussi
 * le nombre de jours effectivement pénalisés, pour la transparence de calcul.
 */
function accrueInterest(
  outstanding: number,
  ratePct: number,
  from: Date,
  to: Date,
  horsContratSegments: { start: Date; end: Date }[],
): { interest: number; penalizedDays: number } {
  const totalDays = Math.max(0, (to.getTime() - from.getTime()) / DAY_MS);
  if (totalDays === 0) return { interest: 0, penalizedDays: 0 };

  const penalizedDays = Math.min(horsContratDaysBetween(from, to, horsContratSegments), totalDays);
  const normalDays = totalDays - penalizedDays;
  const interest =
    outstanding * (ratePct / 100) * (normalDays / YEAR_DAYS) +
    outstanding * ((ratePct + LATE_PAYMENT_PENALTY_PCT) / 100) * (penalizedDays / YEAR_DAYS);

  return { interest, penalizedDays };
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
 *
 * Pénalité de retard : dès que le dossier est hors-contrat (au-delà de son
 * échéance actuelle, avant toute régularisation par prorogation — cf.
 * computePostEcheanceSegments), les jours correspondants courent au taux
 * majoré de LATE_PAYMENT_PENALTY_PCT points plutôt qu'au taux contractuel
 * de base. Un dossier "durée cible dépassée" mais toujours avant son
 * échéance contractuelle (segment DEPASSEMENT) n'est pas pénalisé — ce
 * segment reste contractuellement normal (cf. A.3bis).
 */
export function computeCrdDetailed(
  amountRaised: number,
  interestRatePct: number | null | undefined,
  startDate: Date | null | undefined,
  realizedRepayments: { date: Date; amount: number }[],
  now: Date = new Date(),
  lateInterest?: LateInterestInput,
): CrdDetailedResult {
  const sorted = [...realizedRepayments].sort((a, b) => a.date.getTime() - b.date.getTime());
  const totalRepaid = sorted.reduce((sum, r) => sum + r.amount, 0);

  if (!interestRatePct || !startDate) {
    return { crdCapital: computeCrd(amountRaised, totalRepaid), crdInteretsCourus: null, crdTotal: null, joursPenalisesRetard: null };
  }

  const horsContratSegments = lateInterest?.dateEcheanceInitiale
    ? computePostEcheanceSegments(lateInterest.dateEcheanceInitiale, lateInterest.extensions, now)
    : null;

  let outstanding = amountRaised;
  let lastEventDate = startDate;
  let totalPenalizedDays = 0;

  for (const repayment of sorted) {
    const { interest, penalizedDays } = accrueInterest(outstanding, interestRatePct, lastEventDate, repayment.date, horsContratSegments ?? []);
    totalPenalizedDays += penalizedDays;
    const partInterets = Math.min(repayment.amount, interest);
    const partCapital = repayment.amount - partInterets;
    outstanding = Math.max(0, outstanding - partCapital);
    lastEventDate = repayment.date;
  }

  const { interest: crdInteretsCourus, penalizedDays: courusPenalizedDays } = accrueInterest(
    outstanding,
    interestRatePct,
    lastEventDate,
    now,
    horsContratSegments ?? [],
  );
  totalPenalizedDays += courusPenalizedDays;

  return {
    crdCapital: outstanding,
    crdInteretsCourus,
    crdTotal: outstanding + crdInteretsCourus,
    joursPenalisesRetard: horsContratSegments ? Math.round(totalPenalizedDays) : null,
  };
}
