/**
 * Comparaison de deux versions figées d'un dossier de préqualification
 * (spec §15 point 16, §17). Un diff générique champ-par-champ sur l'objet
 * JSON complet produirait trop de bruit pour être lisible (même doctrine
 * que §14 : "ATLAS ne doit pas générer une liste générique complète") — ce
 * module surface uniquement les deltas qui comptent pour une décision :
 * orientation, bilan financier recalculé, et les compteurs par section.
 */

export type FindingSeverityKey = 'INFO' | 'POSITIVE' | 'WATCH' | 'MATERIAL' | 'BLOCKING';

export interface FieldDelta {
  field: string;
  before: number | string | null;
  after: number | string | null;
}

export interface PrequalVersionDiff {
  versionA: number;
  versionB: number;
  orientationA: string | null;
  orientationB: string | null;
  orientationChanged: boolean;
  financialChanges: FieldDelta[];
  findingsCountA: Record<FindingSeverityKey, number>;
  findingsCountB: Record<FindingSeverityKey, number>;
  peopleCountA: number;
  peopleCountB: number;
  companiesCountA: number;
  companiesCountB: number;
  lotsCountA: number;
  lotsCountB: number;
  documentsCountA: number;
  documentsCountB: number;
}

const FINANCIAL_FIELDS = [
  'amountRequested',
  'declaredEquity',
  'provenEquity',
  'coutDeRevient',
  'chiffreAffaires',
  'margeRecalculee',
  'margeRecalculeePct',
  'besoinMaxFinancement',
  'ltaPct',
  'ltcPct',
  'ltvPct',
] as const;

const SEVERITIES: FindingSeverityKey[] = ['BLOCKING', 'MATERIAL', 'WATCH', 'POSITIVE', 'INFO'];

/** Le snapshot est le JSON complet posé par PromotionService (toJsonSnapshot) — même forme que PrequalificationCaseDetail. */
export interface PrequalSnapshotLike {
  orientation?: string | null;
  financial?: Record<string, unknown> | null;
  findings?: { severity: string }[];
  people?: unknown[];
  companies?: unknown[];
  lots?: unknown[];
  documents?: unknown[];
}

function countBySeverity(findings: { severity: string }[] | undefined): Record<FindingSeverityKey, number> {
  const counts: Record<FindingSeverityKey, number> = { BLOCKING: 0, MATERIAL: 0, WATCH: 0, POSITIVE: 0, INFO: 0 };
  for (const f of findings ?? []) {
    if (SEVERITIES.includes(f.severity as FindingSeverityKey)) counts[f.severity as FindingSeverityKey] += 1;
  }
  return counts;
}

function toComparable(value: unknown): number | string | null {
  if (value === null || value === undefined) return null;
  if (typeof value === 'number' || typeof value === 'string') return value;
  return null;
}

export function diffPrequalVersions(versionA: number, snapshotA: PrequalSnapshotLike, versionB: number, snapshotB: PrequalSnapshotLike): PrequalVersionDiff {
  const financialChanges: FieldDelta[] = [];
  for (const field of FINANCIAL_FIELDS) {
    const before = toComparable(snapshotA.financial?.[field]);
    const after = toComparable(snapshotB.financial?.[field]);
    if (before !== after) financialChanges.push({ field, before, after });
  }

  return {
    versionA,
    versionB,
    orientationA: snapshotA.orientation ?? null,
    orientationB: snapshotB.orientation ?? null,
    orientationChanged: (snapshotA.orientation ?? null) !== (snapshotB.orientation ?? null),
    financialChanges,
    findingsCountA: countBySeverity(snapshotA.findings),
    findingsCountB: countBySeverity(snapshotB.findings),
    peopleCountA: snapshotA.people?.length ?? 0,
    peopleCountB: snapshotB.people?.length ?? 0,
    companiesCountA: snapshotA.companies?.length ?? 0,
    companiesCountB: snapshotB.companies?.length ?? 0,
    lotsCountA: snapshotA.lots?.length ?? 0,
    lotsCountB: snapshotB.lots?.length ?? 0,
    documentsCountA: snapshotA.documents?.length ?? 0,
    documentsCountB: snapshotB.documents?.length ?? 0,
  };
}
