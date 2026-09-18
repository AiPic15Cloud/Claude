/**
 * Ratios de covenant LTV/ICR/DSCR (spec ATLAS v2, module MARKO F.3) — version
 * préqualification (P1) du même contrôle que `deals/covenant.util.ts`, avant
 * qu'un Deal n'existe et donc avant tout encours réel (CRD). Simplification
 * assumée et documentée : le LTV réutilise le ratio de couverture "collecte /
 * chiffre d'affaires" déjà calculé par `prequal-financial.util.ts` (pas un
 * CRD réel, qui n'existe qu'une fois le financement décaissé) ; ICR/DSCR
 * comparent le résultat opérationnel / flux de trésorerie estimés (saisie
 * manuelle) aux intérêts de financement ATLAS / à l'encours de financement
 * total — des proxys pré-financement, jamais présentés comme le covenant
 * définitif du Deal une fois promu.
 */

import type { PrequalificationProjectType } from '@prisma/client';

export interface PrequalCovenantThresholds {
  ltvMaxPct: number;
  icrMin: number;
  dscrMin: number;
}

/** Mêmes seuils indicatifs que `deals/covenant.util.ts` (COVENANT_THRESHOLDS), reclassés par type de projet préqual — valeurs illustratives, pas la politique de risque validée. */
const DEFAULT_THRESHOLDS: PrequalCovenantThresholds = { ltvMaxPct: 75, icrMin: 1.15, dscrMin: 1.15 };
export const PREQUAL_COVENANT_THRESHOLDS: Record<PrequalificationProjectType, PrequalCovenantThresholds> = {
  LAND_DIVISION: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  PROPERTY_TRADING_NO_WORKS: { ltvMaxPct: 80, icrMin: 1.15, dscrMin: 1.15 },
  PROPERTY_TRADING_WITH_WORKS: DEFAULT_THRESHOLDS,
  BUILDING_DIVISION: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  RESIDENTIAL_DEVELOPMENT: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  COMMERCIAL_PROPERTY: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  REFINANCING: { ltvMaxPct: 70, icrMin: 1.25, dscrMin: 1.25 },
  OTHER: DEFAULT_THRESHOLDS,
};

export interface PrequalCovenantInput {
  projectType: PrequalificationProjectType | null;
  /** Ratio de couverture LTV pré-financement (collecte/CA), déjà en %, tel que retourné par computePrequalFinancials(). */
  ltvPct: number | null;
  /** Intérêts de financement ATLAS sur durée cible — proxy de "charges d'intérêts sur la période" (ICR). */
  financingInterestOnDurationCible: number;
  /** collecte + emprunt bancaire — proxy de "encours de financement total" (DSCR). */
  totalFinancingExposure: number;
  resultatOperationnelEstime: number | null;
  fluxTresorerieDisponibleEstime: number | null;
}

export interface PrequalCovenantResult {
  ltvPct: number | null;
  ltvThresholdPct: number;
  ltvBreached: boolean | null;
  icr: number | null;
  icrThreshold: number;
  icrBreached: boolean | null;
  dscr: number | null;
  dscrThreshold: number;
  dscrBreached: boolean | null;
}

export function computePrequalCovenants(input: PrequalCovenantInput): PrequalCovenantResult {
  const thresholds = input.projectType !== null ? PREQUAL_COVENANT_THRESHOLDS[input.projectType] : DEFAULT_THRESHOLDS;

  const icr =
    input.resultatOperationnelEstime !== null && input.financingInterestOnDurationCible > 0
      ? Math.round((input.resultatOperationnelEstime / input.financingInterestOnDurationCible) * 100) / 100
      : null;

  const dscr =
    input.fluxTresorerieDisponibleEstime !== null && input.totalFinancingExposure > 0
      ? Math.round((input.fluxTresorerieDisponibleEstime / input.totalFinancingExposure) * 100) / 100
      : null;

  return {
    ltvPct: input.ltvPct,
    ltvThresholdPct: thresholds.ltvMaxPct,
    ltvBreached: input.ltvPct !== null ? input.ltvPct > thresholds.ltvMaxPct : null,
    icr,
    icrThreshold: thresholds.icrMin,
    icrBreached: icr !== null ? icr < thresholds.icrMin : null,
    dscr,
    dscrThreshold: thresholds.dscrMin,
    dscrBreached: dscr !== null ? dscr < thresholds.dscrMin : null,
  };
}
