import type { FractionalCapexResponsable, FractionalTechnicalSubBlock, FractionalTechnicalTier } from '@prisma/client';

/**
 * Asset & Technical Due Diligence Engine (spec V3.1 §6) — registre fermé des
 * 7 sous-blocs techniques, chacun noté par un tier explicite (jamais un
 * score composite opaque agrégeant bâtiment/conformité/état/... en un seul
 * chiffre). Un sous-bloc sans évaluation reste "non évalué" — jamais
 * assimilé à BON par défaut (Unknown ≠ Zero).
 *
 * Le plan CAPEX par horizon (0-1/1-3/3-5/5-10 ans) est calculé à partir des
 * FractionalCapexItem existants (même source que buildReturnsEngineInput,
 * qui alimente déjà NOI/IRR) — jamais un second plan CAPEX susceptible de
 * diverger.
 */

export const TECHNICAL_SUB_BLOCKS: Record<FractionalTechnicalSubBlock, { label: string; criteria: string }> = {
  BATIMENT: { label: 'Bâtiment', criteria: 'Âge, structure, toiture, façade, réseaux, HVAC, électricité, sécurité incendie' },
  CONFORMITE: { label: 'Conformité', criteria: 'Autorisations, ERP/ICPE si applicable, accessibilité, sécurité, conformité d’usage' },
  ETAT: { label: 'État', criteria: 'Immediate repairs, deferred maintenance, pathologies, sinistres' },
  ADAPTABILITE: { label: 'Adaptabilité', criteria: 'Divisibilité, modularité, hauteur, accès, stationnement, charge au sol' },
  OBSOLESCENCE: { label: 'Obsolescence', criteria: 'Technique, fonctionnelle, commerciale, énergétique' },
  ENVIRONNEMENT: { label: 'Environnement', criteria: 'Pollution sols, amiante, risques naturels/technologiques, nuisances' },
  ASSURANCE: { label: 'Assurance', criteria: 'Sinistralité, exclusions, franchises, coût' },
};

/** Ordre de sévérité — utilisé pour dégager le pire tier atteint parmi les sous-blocs évalués. */
const TIER_SEVERITY: Record<FractionalTechnicalTier, number> = { BON: 0, MOYEN: 1, MAUVAIS: 2, CRITIQUE: 3 };

export interface TechnicalAssessmentLike {
  subBlock: FractionalTechnicalSubBlock;
  tier: FractionalTechnicalTier;
  conditionPrealable: boolean;
  notes: string | null;
}

export interface TechnicalSubBlockResult {
  subBlock: FractionalTechnicalSubBlock;
  label: string;
  criteria: string;
  tier: FractionalTechnicalTier | null;
  conditionPrealable: boolean;
  notes: string | null;
}

export interface TechnicalRiskRatingResult {
  subBlocks: TechnicalSubBlockResult[];
  worstTier: FractionalTechnicalTier | null;
  criticalCount: number;
  conditionPrealableCount: number;
  unassessedCount: number;
}

export function computeTechnicalRiskRating(assessments: TechnicalAssessmentLike[]): TechnicalRiskRatingResult {
  const byBlock = new Map(assessments.map((a) => [a.subBlock, a]));

  let worstTier: FractionalTechnicalTier | null = null;
  let criticalCount = 0;
  let conditionPrealableCount = 0;
  let unassessedCount = 0;

  const subBlocks: TechnicalSubBlockResult[] = (Object.keys(TECHNICAL_SUB_BLOCKS) as FractionalTechnicalSubBlock[]).map((subBlock) => {
    const def = TECHNICAL_SUB_BLOCKS[subBlock];
    const record = byBlock.get(subBlock);

    if (!record) {
      unassessedCount += 1;
      return { subBlock, label: def.label, criteria: def.criteria, tier: null, conditionPrealable: false, notes: null };
    }

    if (record.tier === 'CRITIQUE') criticalCount += 1;
    if (record.conditionPrealable) conditionPrealableCount += 1;
    if (worstTier === null || TIER_SEVERITY[record.tier] > TIER_SEVERITY[worstTier]) worstTier = record.tier;

    return { subBlock, label: def.label, criteria: def.criteria, tier: record.tier, conditionPrealable: record.conditionPrealable, notes: record.notes };
  });

  return { subBlocks, worstTier, criticalCount, conditionPrealableCount, unassessedCount };
}

export type CapexHorizon = 'ANS_0_1' | 'ANS_1_3' | 'ANS_3_5' | 'ANS_5_10' | 'HORS_HORIZON';

export const CAPEX_HORIZON_LABELS: Record<CapexHorizon, string> = {
  ANS_0_1: '0–1 an',
  ANS_1_3: '1–3 ans',
  ANS_3_5: '3–5 ans',
  ANS_5_10: '5–10 ans',
  HORS_HORIZON: 'Hors horizon (>10 ans ou passé)',
};

function resolveHorizon(yearsFromNow: number): CapexHorizon {
  if (yearsFromNow < 0) return 'HORS_HORIZON';
  if (yearsFromNow <= 1) return 'ANS_0_1';
  if (yearsFromNow <= 3) return 'ANS_1_3';
  if (yearsFromNow <= 5) return 'ANS_3_5';
  if (yearsFromNow <= 10) return 'ANS_5_10';
  return 'HORS_HORIZON';
}

export interface CapexItemLike {
  annee: number;
  montant: number;
  responsable: FractionalCapexResponsable;
}

export interface CapexHorizonBucket {
  horizon: CapexHorizon;
  label: string;
  proprietaireTotal: number;
  locataireTotal: number;
  total: number;
}

const HORIZON_ORDER: CapexHorizon[] = ['ANS_0_1', 'ANS_1_3', 'ANS_3_5', 'ANS_5_10', 'HORS_HORIZON'];

export function computeCapexPlanByHorizon(items: CapexItemLike[], currentYear: number): CapexHorizonBucket[] {
  const buckets = new Map<CapexHorizon, { proprietaireTotal: number; locataireTotal: number }>(HORIZON_ORDER.map((h) => [h, { proprietaireTotal: 0, locataireTotal: 0 }]));

  for (const item of items) {
    const horizon = resolveHorizon(item.annee - currentYear);
    const bucket = buckets.get(horizon)!;
    if (item.responsable === 'PROPRIETAIRE') bucket.proprietaireTotal += item.montant;
    else bucket.locataireTotal += item.montant;
  }

  return HORIZON_ORDER.map((horizon) => {
    const b = buckets.get(horizon)!;
    return { horizon, label: CAPEX_HORIZON_LABELS[horizon], proprietaireTotal: b.proprietaireTotal, locataireTotal: b.locataireTotal, total: b.proprietaireTotal + b.locataireTotal };
  });
}
