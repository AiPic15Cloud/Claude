import type { DealSurveillanceStatus } from '@prisma/client';
import type { Velocity } from './risk-velocity.util';

/**
 * Rang de sévérité des 4 paliers — sert à la fois à comparer deux statuts
 * (escalade/désescalade) et à appliquer un plancher (hard override, override
 * analyste). CRITIQUE (rang 3) n'est jamais atteint par le seul score
 * composite — voir baseBand() et classifySurveillanceStatus() ci-dessous —
 * uniquement via un plancher dur (hard override) ou un override analyste
 * explicite.
 */
export const SURVEILLANCE_RANK: Record<DealSurveillanceStatus, number> = {
  FAIBLE: 0,
  SOUS_SURVEILLANCE: 1,
  ELEVE: 2,
  CRITIQUE: 3,
};

// Plafond du scoring pur : le score composite et son escalade EWS/vélocité ne
// peuvent jamais produire CRITIQUE (rang 3) par eux-mêmes.
const RANK_TO_BASE_STATUS: DealSurveillanceStatus[] = ['FAIBLE', 'SOUS_SURVEILLANCE', 'ELEVE'];

function baseBand(compositeScore: number): number {
  if (compositeScore <= 25) return 0; // FAIBLE
  if (compositeScore <= 50) return 1; // SOUS_SURVEILLANCE
  return 2; // ELEVE — y compris pour un score très élevé (76-100) sans déclencheur dur actif
}

export interface ClassifySurveillanceInput {
  compositeScore: number;
  velocity: Velocity;
  /** Planchers de tous les hard overrides actuellement actifs sur le dossier. */
  activeHardOverrideFloors: DealSurveillanceStatus[];
  /** Statut forcé par l'analyste, s'il y en a un actif. */
  analystOverrideStatus: DealSurveillanceStatus | null;
}

export interface ClassifySurveillanceResult {
  /** Statut avant tout override — utile à l'UI pour montrer "le score dirait X, mais...". */
  automaticStatus: DealSurveillanceStatus;
  finalStatus: DealSurveillanceStatus;
}

export function classifySurveillanceStatus(input: ClassifySurveillanceInput): ClassifySurveillanceResult {
  let band = baseBand(input.compositeScore);

  // Escalade : une vélocité qui se dégrade rapidement peut pousser le statut
  // au-delà de ce que le seul score composite indiquerait — une amélioration
  // rapide (AMELIORATION) n'escalade jamais. Plafonnée à ELEVE (rang 2) :
  // l'escalade ne peut jamais produire CRITIQUE. Avant le passage au score
  // additif unique (v3.0), un EWS élevé escaladait aussi le palier — devenu
  // inutile : un score plat où chaque mauvais signal contribue déjà
  // directement au total n'a plus besoin de ce correctif de dilution.
  if (input.velocity.direction === 'AGGRAVATION') {
    if (input.velocity.band === 'DETERIORATION_RAPIDE') band += 2;
    else if (input.velocity.band === 'DERIVE') band += 1;
  }
  band = Math.min(band, RANK_TO_BASE_STATUS.length - 1);

  const automaticStatus = RANK_TO_BASE_STATUS[band];

  // Plancher final : hard override ET override analyste ne peuvent jamais
  // faire baisser le statut sous le plus sévère des deux planchers actifs —
  // un override analyste peut en revanche monter plus haut que ce plancher.
  const candidateStatus = input.analystOverrideStatus ?? automaticStatus;
  const floorRank = Math.max(SURVEILLANCE_RANK[candidateStatus], ...input.activeHardOverrideFloors.map((f) => SURVEILLANCE_RANK[f]), 0);
  const finalStatus = statusForRank(floorRank, candidateStatus, input.activeHardOverrideFloors);

  return { automaticStatus, finalStatus };
}

function statusForRank(rank: number, candidate: DealSurveillanceStatus, floors: DealSurveillanceStatus[]): DealSurveillanceStatus {
  if (SURVEILLANCE_RANK[candidate] === rank) return candidate;
  const floorAtRank = floors.find((f) => SURVEILLANCE_RANK[f] === rank);
  return floorAtRank ?? RANK_TO_BASE_STATUS[rank] ?? 'CRITIQUE';
}
