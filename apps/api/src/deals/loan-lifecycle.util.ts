const DAY_MS = 86_400_000;

export type LoanLifecycleSegmentKind = 'NORMAL' | 'DEPASSEMENT' | 'HORS_CONTRAT' | 'PROROGE';

export interface LoanLifecycleSegment {
  kind: LoanLifecycleSegmentKind;
  start: Date;
  end: Date;
}

export type LoanLifecycleTerminalType = 'REMBOURSE' | 'DEFAUT' | 'PROCEDURE_COLLECTIVE';

export interface LoanLifecycleTerminal {
  type: LoanLifecycleTerminalType;
  date: Date;
}

export interface LoanExtensionInput {
  dateSignature: Date;
  nouvelleDateEcheance: Date;
}

export interface LoanLifecycleInput {
  startDate: Date | null | undefined;
  durationMonths: number | null | undefined;
  dateEcheanceInitiale: Date | null | undefined;
  /** Doit déjà être triée par dateSignature croissante. */
  extensions: LoanExtensionInput[];
  terminal: LoanLifecycleTerminal | null;
}

export interface PostEcheanceSegment {
  kind: Extract<LoanLifecycleSegmentKind, 'HORS_CONTRAT' | 'PROROGE'>;
  start: Date;
  end: Date;
}

/**
 * Segments après l'échéance contractuelle initiale — hors-contrat (rouge) et
 * prorogé (orange), en alternance selon les prorogations signées. Extrait de
 * computeLoanLifecycle pour être réutilisé par le calcul d'intérêts du CRD
 * (A.3ter) : la pénalité de retard ne s'applique que sur les jours
 * réellement hors-contrat, jamais sur une période régularisée par
 * prorogation. Un segment hors-contrat n'est jamais réécrit rétroactivement
 * en prorogé par une prorogation suivante — un seul pli chronologique en
 * avant, jamais de passe de correction du passé.
 */
export function computePostEcheanceSegments(
  dateEcheanceInitiale: Date,
  extensions: LoanExtensionInput[],
  finDate: Date,
): PostEcheanceSegment[] {
  const segments: PostEcheanceSegment[] = [];
  let cursor = dateEcheanceInitiale;
  let echeanceCourante = dateEcheanceInitiale;

  for (const ext of extensions) {
    if (cursor.getTime() >= finDate.getTime()) break;

    const isRattrapage = ext.dateSignature.getTime() > echeanceCourante.getTime();
    if (isRattrapage) {
      const segEnd = ext.dateSignature.getTime() < finDate.getTime() ? ext.dateSignature : finDate;
      if (segEnd.getTime() > cursor.getTime()) {
        segments.push({ kind: 'HORS_CONTRAT', start: cursor, end: segEnd });
      }
      cursor = segEnd;
    }

    if (cursor.getTime() >= finDate.getTime()) break;

    const segEnd4 = ext.nouvelleDateEcheance.getTime() < finDate.getTime() ? ext.nouvelleDateEcheance : finDate;
    if (segEnd4.getTime() > cursor.getTime()) {
      segments.push({ kind: 'PROROGE', start: cursor, end: segEnd4 });
    }
    cursor = segEnd4;
    echeanceCourante = ext.nouvelleDateEcheance;
  }

  // Rien signé, mais on dépasse la dernière échéance connue : le retard
  // continue de courir en "hors contrat" jusqu'à finDate, sans attendre une
  // prorogation pour rester honnête sur le dépassement réel.
  if (cursor.getTime() < finDate.getTime()) {
    segments.push({ kind: 'HORS_CONTRAT', start: cursor, end: finDate });
  }

  return segments;
}

export type LoanLifecycleResult =
  | { status: 'INSUFFICIENT_DATA' }
  | {
      status: 'OK';
      dateDureeCible: Date;
      segments: LoanLifecycleSegment[];
      terminal: LoanLifecycleTerminal | null;
      todayCursor: Date | null;
      retardDays: number;
    };

/**
 * Calcul pur de la frise du cycle de vie du prêt (spec ATLAS v2, A.3bis) —
 * aucune requête, entièrement dérivé de son input. dateDureeCible reprend
 * exactement la formule de duration-target.util.ts (startDate + durationMonths)
 * mais dupliquée ici en TS pur : le but est de garder cet util testable en
 * isolation, pas de dépendre d'un service Nest.
 */
export function computeLoanLifecycle(input: LoanLifecycleInput, now: Date = new Date()): LoanLifecycleResult {
  const { startDate, durationMonths, dateEcheanceInitiale, extensions, terminal } = input;

  if (!startDate || !durationMonths || durationMonths <= 0 || !dateEcheanceInitiale) {
    return { status: 'INSUFFICIENT_DATA' };
  }

  const dateDureeCible = new Date(startDate);
  dateDureeCible.setMonth(dateDureeCible.getMonth() + durationMonths);

  if (dateEcheanceInitiale.getTime() <= startDate.getTime()) {
    return { status: 'INSUFFICIENT_DATA' };
  }

  const finDate = terminal ? terminal.date : now;

  // dateDureeCible (startDate + durationMonths) est en principe ≤
  // dateEcheanceInitiale, mais rien ne le garantit : un analyste peut saisir
  // une durée cible plus longue que le délai jusqu'à l'échéance
  // contractuelle. Sans ce plafond, le segment NORMAL (borné par
  // dateDureeCible) s'étendrait au-delà de dateEcheanceInitiale et
  // chevaucherait le(s) segment(s) HORS_CONTRAT/PROROGE produits par
  // computePostEcheanceSegments (qui, eux, partent toujours de
  // dateEcheanceInitiale) — et retardDays, calculé contre dateDureeCible,
  // resterait à 0 alors que le prêt est déjà contractuellement en retard. Le
  // prêt ne peut jamais être "dans les clous" au-delà de son échéance
  // contractuelle réelle, quelle que soit la durée cible saisie : on borne
  // donc tout calcul de segment/retard à min(dateDureeCible, dateEcheanceInitiale).
  // Le champ dateDureeCible renvoyé à l'appelant, lui, reste la vraie date
  // cible saisie (valeur informative, non plafonnée).
  const effectiveDureeCible = dateDureeCible.getTime() < dateEcheanceInitiale.getTime() ? dateDureeCible : dateEcheanceInitiale;

  const segments: LoanLifecycleSegment[] = [];

  // Segment 1 — en cours normal.
  const segment1End = effectiveDureeCible.getTime() < finDate.getTime() ? effectiveDureeCible : finDate;
  if (segment1End.getTime() > startDate.getTime()) {
    segments.push({ kind: 'NORMAL', start: startDate, end: segment1End });
  }

  // Segment 2 — durée cible dépassée, toujours contractuellement normal.
  // Ne peut jamais dépasser dateEcheanceInitiale (effectiveDureeCible en
  // tient déjà lieu quand la durée cible dépasse l'échéance contractuelle,
  // auquel cas ce segment devient vide — voir plus haut).
  if (finDate.getTime() > effectiveDureeCible.getTime()) {
    const segment2End = dateEcheanceInitiale.getTime() < finDate.getTime() ? dateEcheanceInitiale : finDate;
    if (segment2End.getTime() > effectiveDureeCible.getTime()) {
      segments.push({ kind: 'DEPASSEMENT', start: effectiveDureeCible, end: segment2End });
    }
  }

  // Segments 3/4 — un cycle hors-contrat (rouge, seulement si rattrapage) +
  // prorogé (orange) par entrée de extensions, dans l'ordre chronologique.
  // Une fois généré, un segment 3 rouge n'est jamais réécrit rétroactivement
  // en orange par une prorogation suivante — la fonction ne fait qu'un pli
  // chronologique en avant, jamais de passe de correction du passé.
  segments.push(...computePostEcheanceSegments(dateEcheanceInitiale, extensions, finDate));

  const retardMs = Math.max(0, finDate.getTime() - effectiveDureeCible.getTime());
  const retardDays = Math.floor(retardMs / DAY_MS);

  return {
    status: 'OK',
    dateDureeCible,
    segments,
    terminal,
    todayCursor: terminal ? null : now,
    retardDays,
  };
}
