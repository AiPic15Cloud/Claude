/**
 * Conversions par cohorte — "Performance utile" (spec Cockpit/Fractionné P2
 * §4.1.5) : "pistes reçues, qualifiées, présentées, accords de principe et
 * acquisitions signées sur une période choisie ; taux de conversion calculé
 * sur des cohortes cohérentes et délais médians lorsque l'échantillon le
 * permet. Avec deux dossiers, afficher les nombres bruts, pas un pourcentage
 * spectaculaire."
 *
 * S'appuie sur FractionalStatusHistory (journal des transitions, P1) — un
 * projet "atteint" une étape du funnel dès qu'il est passé par ce statut ou
 * un statut ultérieur dans l'ordre réel du pipeline (voir STAGE_ORDER),
 * jamais seulement son statut actuel (un dossier REFUSE après ACQUISITION
 * a quand même signé).
 */

export type FunnelStageKey = 'RECUES' | 'QUALIFIEES' | 'PRESENTEES' | 'ACCORDS' | 'ACQUISES';

// Ordre réel du pipeline (schema.prisma FractionalProjectStatus) — REFUSE/
// ABANDONNE sont des sorties de route, jamais une étape du funnel de
// progression.
const STAGE_ORDER: Record<string, number> = {
  PISTE: 0,
  QUALIFICATION: 1,
  ANALYSE: 2,
  STRUCTURATION: 3,
  VALIDATION_PLATEFORME: 4,
  COLLECTE: 5,
  ACQUISITION: 6,
  EXPLOITATION: 7,
  SORTIE: 8,
};

export const FUNNEL_STAGES: { key: FunnelStageKey; label: string; status: string }[] = [
  { key: 'RECUES', label: 'Pistes reçues', status: 'PISTE' },
  { key: 'QUALIFIEES', label: 'Qualifiées', status: 'QUALIFICATION' },
  { key: 'PRESENTEES', label: 'Présentées', status: 'VALIDATION_PLATEFORME' },
  { key: 'ACCORDS', label: 'Accords de principe', status: 'COLLECTE' },
  { key: 'ACQUISES', label: 'Acquisitions signées', status: 'ACQUISITION' },
];

// En-dessous de ce seuil de dossiers, un taux de conversion serait un
// pourcentage spectaculaire sur un échantillon minuscule — la spec demande
// explicitement les nombres bruts à la place.
const MIN_SAMPLE_FOR_RATES = 5;

export interface StatusHistoryRow {
  projectId: string;
  toStatus: string;
  changedAt: Date;
}

export interface FunnelStageResult {
  key: FunnelStageKey;
  label: string;
  count: number;
}

export interface FunnelConversionResult {
  fromKey: FunnelStageKey;
  toKey: FunnelStageKey;
  fromCount: number;
  toCount: number;
  ratePct: number | null;
  medianDays: number | null;
}

export interface PipelineConversionResult {
  totalProjects: number;
  sampleTooSmallForRates: boolean;
  stages: FunnelStageResult[];
  conversions: FunnelConversionResult[];
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

export function computePipelineConversion(history: StatusHistoryRow[]): PipelineConversionResult {
  const byProject = new Map<string, StatusHistoryRow[]>();
  for (const row of history) {
    if (!(row.toStatus in STAGE_ORDER)) continue; // REFUSE/ABANDONNE : jamais une étape du funnel
    const rows = byProject.get(row.projectId) ?? [];
    rows.push(row);
    byProject.set(row.projectId, rows);
  }

  // Pour chaque projet, la première date à laquelle il a atteint (ou
  // dépassé) chaque étape du funnel.
  const reachedAtByProject = new Map<string, Map<FunnelStageKey, Date>>();
  for (const [projectId, rows] of byProject) {
    const sorted = [...rows].sort((a, b) => a.changedAt.getTime() - b.changedAt.getTime());
    const reachedAt = new Map<FunnelStageKey, Date>();
    for (const stage of FUNNEL_STAGES) {
      const stageOrder = STAGE_ORDER[stage.status];
      const firstReached = sorted.find((r) => STAGE_ORDER[r.toStatus] >= stageOrder);
      if (firstReached) reachedAt.set(stage.key, firstReached.changedAt);
    }
    reachedAtByProject.set(projectId, reachedAt);
  }

  const totalProjects = byProject.size;

  const stages: FunnelStageResult[] = FUNNEL_STAGES.map((stage) => ({
    key: stage.key,
    label: stage.label,
    count: Array.from(reachedAtByProject.values()).filter((m) => m.has(stage.key)).length,
  }));

  const conversions: FunnelConversionResult[] = [];
  for (let i = 0; i < FUNNEL_STAGES.length - 1; i++) {
    const from = stages[i];
    const to = stages[i + 1];
    const delays: number[] = [];
    for (const reachedAt of reachedAtByProject.values()) {
      const fromDate = reachedAt.get(from.key);
      const toDate = reachedAt.get(to.key);
      if (fromDate && toDate) delays.push((toDate.getTime() - fromDate.getTime()) / 86_400_000);
    }
    conversions.push({
      fromKey: from.key,
      toKey: to.key,
      fromCount: from.count,
      toCount: to.count,
      ratePct: from.count > 0 ? Math.round((to.count / from.count) * 100) : null,
      medianDays: median(delays),
    });
  }

  return { totalProjects, sampleTooSmallForRates: totalProjects < MIN_SAMPLE_FOR_RATES, stages, conversions };
}
