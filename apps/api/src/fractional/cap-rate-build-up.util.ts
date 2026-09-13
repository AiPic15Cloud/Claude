/**
 * Cap Rate Build-Up Engine (Complément H, H.3). Reconstruit un cap rate
 * théorique à partir de composantes nommées et visibles — TEC10 (taux sans
 * risque long terme) + prime immobilière (état de l'actif) + prime de
 * localisation + prime de liquidité (profondeur de marché × durée résiduelle
 * sécurisée) — pour objectiver un écart avec le cap rate implicite du prix
 * payé, plutôt que de prendre pour argent comptant le cap rate affiché par
 * le vendeur. Jamais un chiffre opaque : chaque prime est un barème à seuils
 * explicite, pas une estimation à l'œil.
 */

export type PropertyConditionTier = 'CORE' | 'CORE_PLUS' | 'VALUE_ADD' | 'OPPORTUNISTE' | 'DISTRESSED';
export type LocationTier = 'PARIS_QCA' | 'SECONDAIRE' | 'TERTIAIRE_A' | 'TERTIAIRE_B' | 'TERTIAIRE_C';
export type MarketDepth = 'PROFOND' | 'MOYEN' | 'FAIBLE';

/** Prime immobilière (pts) selon l'état de l'actif — barème à seuils explicite, à calibrer une fois des dossiers réels disponibles. */
export const CONDITION_PREMIUM_PCT: Record<PropertyConditionTier, number> = {
  CORE: 0,
  CORE_PLUS: 0.5,
  VALUE_ADD: 1.5,
  OPPORTUNISTE: 3,
  DISTRESSED: 5,
};

/** Prime de localisation (pts) selon le positionnement de la zone. */
export const LOCATION_PREMIUM_PCT: Record<LocationTier, number> = {
  PARIS_QCA: 0,
  SECONDAIRE: 0.75,
  TERTIAIRE_A: 1.25,
  TERTIAIRE_B: 2,
  TERTIAIRE_C: 3,
};

/**
 * Matrice profondeur de marché × durée résiduelle sécurisée (WALB) — un actif
 * illiquide avec un WALB court porte la prime la plus élevée (spec H.3). WALB
 * indisponible (aucun bail exploitable) traité comme le pire cas de la ligne
 * — jamais un 0% implicite quand la donnée manque.
 */
const LIQUIDITY_PREMIUM_TABLE: Record<MarketDepth, { walbAtLeast5: number; walbBetween2And5: number; walbBelow2: number }> = {
  PROFOND: { walbAtLeast5: 0, walbBetween2And5: 0.25, walbBelow2: 0.75 },
  MOYEN: { walbAtLeast5: 0.5, walbBetween2And5: 1, walbBelow2: 1.75 },
  FAIBLE: { walbAtLeast5: 1.5, walbBetween2And5: 2.25, walbBelow2: 3.5 },
};

function resolveLiquidityPremiumPct(marketDepth: MarketDepth, walbYears: number | null): number {
  const row = LIQUIDITY_PREMIUM_TABLE[marketDepth];
  if (walbYears === null) return row.walbBelow2;
  if (walbYears >= 5) return row.walbAtLeast5;
  if (walbYears >= 2) return row.walbBetween2And5;
  return row.walbBelow2;
}

export interface CapRateBuildUpInput {
  tec10Pct: number;
  propertyCondition: PropertyConditionTier;
  locationTier: LocationTier;
  marketDepth: MarketDepth;
  walbYears: number | null;
}

export interface CapRateBuildUpResult {
  tec10Pct: number;
  conditionPremiumPct: number;
  locationPremiumPct: number;
  liquidityPremiumPct: number;
  capRatePct: number;
}

export function computeCapRateBuildUp(input: CapRateBuildUpInput): CapRateBuildUpResult {
  const conditionPremiumPct = CONDITION_PREMIUM_PCT[input.propertyCondition];
  const locationPremiumPct = LOCATION_PREMIUM_PCT[input.locationTier];
  const liquidityPremiumPct = resolveLiquidityPremiumPct(input.marketDepth, input.walbYears);
  return {
    tec10Pct: input.tec10Pct,
    conditionPremiumPct,
    locationPremiumPct,
    liquidityPremiumPct,
    capRatePct: input.tec10Pct + conditionPremiumPct + locationPremiumPct + liquidityPremiumPct,
  };
}

export interface CapRateComparisonResult {
  buildUp: CapRateBuildUpResult;
  impliedCapRatePct: number;
  /** impliedCapRatePct - buildUp.capRatePct — positif : acheté au-dessus du cap rate Atlas (décote de prix) ; négatif : acheté en dessous (prix cher, la thèse dépend d'une compression de taux — spec §11.1). */
  gapPts: number;
}

export function compareToImpliedCapRate(buildUp: CapRateBuildUpResult, impliedCapRatePct: number): CapRateComparisonResult {
  return { buildUp, impliedCapRatePct, gapPts: impliedCapRatePct - buildUp.capRatePct };
}
