import type { FractionalDpeClass, FractionalEsgEquipmentTier, FractionalEsgPhysicalRiskTier } from '@prisma/client';

/**
 * ESG, Energy & Obsolescence Risk Engine (spec V3.1 §12) — traduit les
 * dimensions ESG en impact économique chiffré (CAPEX to comply / CAPEX to
 * compete / prime de risque de décote), plutôt qu'un score décoratif
 * ("Atlas doit relier ESG → cash-flow → valeur"). Deux familles de
 * traitement distinctes selon la donnée manquante :
 *  - une estimation monétaire (CAPEX) sans classe DPE connue reste `null`
 *    (aucune base de calcul, jamais un montant deviné) ;
 *  - une prime de risque (cap rate) traite l'absence de donnée comme le pire
 *    cas plausible, même principe que la prime de liquidité de
 *    cap-rate-build-up.util.ts (WALB manquant → pire ligne du barème) —
 *    l'absence d'évaluation ne doit jamais se traduire par une prime nulle.
 */

const DPE_CLASS_ORDER: Record<FractionalDpeClass, number> = { A: 1, B: 2, C: 3, D: 4, E: 5, F: 6, G: 7 };

/**
 * Coût (€/m²) pour ramener l'actif à la classe C — seuil pris comme proxy
 * pratique du décret tertiaire (-40% de consommation par rapport à une
 * référence 2010, simplification documentée, à calibrer par typologie une
 * fois des devis réels disponibles). Nul si déjà classe C ou meilleure.
 */
export const CAPEX_TO_COMPLY_PER_M2: Record<FractionalDpeClass, number> = {
  A: 0,
  B: 0,
  C: 0,
  D: 40,
  E: 90,
  F: 160,
  G: 240,
};

/** Coût (€/m²) pour atteindre la classe B — standard de compétitivité marché, indépendant de l'assujettissement au décret tertiaire. */
export const CAPEX_TO_COMPETE_PER_M2: Record<FractionalDpeClass, number> = {
  A: 0,
  B: 0,
  C: 60,
  D: 100,
  E: 150,
  F: 220,
  G: 300,
};

/** Prime de cap rate (pts) pour risque de décote (stranded asset) — barème à seuils explicite, calibrable. */
export const STRANDED_ASSET_PREMIUM_PCT: Record<FractionalDpeClass, number> = {
  A: 0,
  B: 0,
  C: 0,
  D: 0,
  E: 0.25,
  F: 0.75,
  G: 1.5,
};

export const EQUIPMENT_OBSOLESCENCE_PREMIUM_PCT: Record<FractionalEsgEquipmentTier, number> = {
  NEUF: 0,
  BON: 0,
  VETUSTE: 0.25,
  OBSOLETE: 0.75,
};

export const PHYSICAL_RISK_PREMIUM_PCT: Record<FractionalEsgPhysicalRiskTier, number> = {
  FAIBLE: 0,
  MODERE: 0.25,
  ELEVE: 0.75,
};

/** Pire cas de chaque barème — appliqué quand la dimension n'a pas été évaluée, jamais une prime nulle par défaut. */
const WORST_DPE_CLASS: FractionalDpeClass = 'G';
const WORST_EQUIPMENT_TIER: FractionalEsgEquipmentTier = 'OBSOLETE';
const WORST_PHYSICAL_RISK_TIER: FractionalEsgPhysicalRiskTier = 'ELEVE';

export interface EsgRiskInput {
  dpeClass: FractionalDpeClass | null;
  consumptionKwhM2An: number | null;
  decreeTertiaireSubject: boolean;
  equipmentConditionTier: FractionalEsgEquipmentTier | null;
  physicalRiskExposure: FractionalEsgPhysicalRiskTier | null;
  greenLeaseClauses: boolean;
}

export interface EsgRiskResult {
  dpeClassKnown: boolean;
  capexToComplyPerM2: number | null;
  capexToComplyTotal: number | null;
  capexToCompetePerM2: number | null;
  capexToCompeteTotal: number | null;
  strandedAssetPremiumPct: number;
  equipmentObsolescencePremiumPct: number;
  physicalRiskPremiumPct: number;
  totalValuationImpactPts: number;
}

export function computeEsgRiskProfile(input: EsgRiskInput, surfaceM2: number | null): EsgRiskResult {
  const dpeClassKnown = input.dpeClass !== null;

  const capexToComplyPerM2 = dpeClassKnown && input.decreeTertiaireSubject ? CAPEX_TO_COMPLY_PER_M2[input.dpeClass as FractionalDpeClass] : dpeClassKnown ? 0 : null;
  const capexToCompetePerM2 = dpeClassKnown ? CAPEX_TO_COMPETE_PER_M2[input.dpeClass as FractionalDpeClass] : null;

  const capexToComplyTotal = capexToComplyPerM2 !== null && surfaceM2 !== null ? Math.round(capexToComplyPerM2 * surfaceM2) : null;
  const capexToCompeteTotal = capexToCompetePerM2 !== null && surfaceM2 !== null ? Math.round(capexToCompetePerM2 * surfaceM2) : null;

  const strandedAssetPremiumPct = STRANDED_ASSET_PREMIUM_PCT[input.dpeClass ?? WORST_DPE_CLASS];
  const equipmentObsolescencePremiumPct = EQUIPMENT_OBSOLESCENCE_PREMIUM_PCT[input.equipmentConditionTier ?? WORST_EQUIPMENT_TIER];
  const physicalRiskPremiumPct = PHYSICAL_RISK_PREMIUM_PCT[input.physicalRiskExposure ?? WORST_PHYSICAL_RISK_TIER];

  return {
    dpeClassKnown,
    capexToComplyPerM2,
    capexToComplyTotal,
    capexToCompetePerM2,
    capexToCompeteTotal,
    strandedAssetPremiumPct,
    equipmentObsolescencePremiumPct,
    physicalRiskPremiumPct,
    totalValuationImpactPts: strandedAssetPremiumPct + equipmentObsolescencePremiumPct + physicalRiskPremiumPct,
  };
}

/** DPE class numeric order (A=1 best .. G=7 worst) — exposed for UI comparisons (ex. "à 2 classes de la cible"). */
export function dpeClassGap(current: FractionalDpeClass, target: FractionalDpeClass): number {
  return DPE_CLASS_ORDER[current] - DPE_CLASS_ORDER[target];
}
