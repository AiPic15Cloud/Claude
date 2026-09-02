import type { DealType } from '@prisma/client';

export interface CovenantThresholds {
  ltvMaxPct: number;
  icrMin: number;
  dscrMin: number;
}

/**
 * Seuils de covenant par typologie (spec ATLAS v2, module MARKO F.3) —
 * valeurs indicatives usuelles pour du financement immobilier court terme,
 * PAS la politique de risque validée de LPB : à faire confirmer avant tout
 * usage en décision réelle. Même doctrine que STRESS_ASSUMED_DEFAULT_RATE
 * dans DealsService.kpis() — un taux illustratif documenté comme tel,
 * jamais présenté comme calibré.
 */
export const COVENANT_THRESHOLDS: Record<DealType, CovenantThresholds> = {
  PROMOTION_IMMOBILIERE: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  DIVISION_PARCELLAIRE: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  DIVISION_FONCIERE: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  MISE_EN_COPROPRIETE: { ltvMaxPct: 70, icrMin: 1.2, dscrMin: 1.2 },
  AMENAGEMENT_FONCIER: { ltvMaxPct: 65, icrMin: 1.2, dscrMin: 1.2 },
  MARCHAND_DE_BIENS_AVEC_TRAVAUX: { ltvMaxPct: 75, icrMin: 1.15, dscrMin: 1.15 },
  MARCHAND_DE_BIENS_SANS_TRAVAUX: { ltvMaxPct: 80, icrMin: 1.15, dscrMin: 1.15 },
  REFINANCEMENT_FONDS_PROPRES: { ltvMaxPct: 65, icrMin: 1.3, dscrMin: 1.3 },
  REFINANCEMENT_ACTIF: { ltvMaxPct: 70, icrMin: 1.25, dscrMin: 1.25 },
  REFINANCEMENT_STOCK: { ltvMaxPct: 75, icrMin: 1.2, dscrMin: 1.2 },
};

export interface CovenantInput {
  dealType: DealType;
  /** CRD total (capital + intérêts courus) — déjà calculé par crd.util.ts. Null si taux/date de départ manquants (computeCrdDetailed dégrade alors tout à null). */
  crdTotal: number | null;
  /** Intérêts courus seuls — sert de proxy à "charges d'intérêts sur la période" (ICR), aucune nouvelle donnée collectée. */
  crdInteretsCourus: number | null;
  /** surfaceSqm × sellingPricePerSqm (FinancialAssumption, déjà saisi pour le BP) — "valeur du projet à la sortie visée". Null si l'un des deux n'est pas renseigné. */
  valeurSortieVisee: number | null;
  /** Saisie manuelle (spec F.3) — n'existe pour aucune opération marchand de biens à cycle court sans revenu d'exploitation ; laissé à l'analyste de juger la pertinence au cas par cas. */
  resultatOperationnelEstime: number | null;
  /** Idem, saisie manuelle. */
  fluxTresorerieDisponibleEstime: number | null;
}

export interface CovenantResult {
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

/**
 * LTV est directement applicable (données déjà présentes). ICR/DSCR ont un
 * point de vigilance méthodologique explicite dans la spec : plus naturels
 * pour un actif à revenu récurrent que pour du marchand de biens à cycle
 * court — retournés null tant que l'analyste n'a pas renseigné la donnée,
 * jamais une valeur par défaut qui laisserait croire à un calcul réel.
 */
export function computeCovenants(input: CovenantInput): CovenantResult {
  const thresholds = COVENANT_THRESHOLDS[input.dealType];

  const ltvPct =
    input.crdTotal !== null && input.valeurSortieVisee !== null && input.valeurSortieVisee > 0
      ? Math.round((input.crdTotal / input.valeurSortieVisee) * 1000) / 10
      : null;

  const icr =
    input.resultatOperationnelEstime !== null && input.crdInteretsCourus !== null && input.crdInteretsCourus > 0
      ? Math.round((input.resultatOperationnelEstime / input.crdInteretsCourus) * 100) / 100
      : null;

  const dscr =
    input.fluxTresorerieDisponibleEstime !== null && input.crdTotal !== null && input.crdTotal > 0
      ? Math.round((input.fluxTresorerieDisponibleEstime / input.crdTotal) * 100) / 100
      : null;

  return {
    ltvPct,
    ltvThresholdPct: thresholds.ltvMaxPct,
    ltvBreached: ltvPct !== null ? ltvPct > thresholds.ltvMaxPct : null,
    icr,
    icrThreshold: thresholds.icrMin,
    icrBreached: icr !== null ? icr < thresholds.icrMin : null,
    dscr,
    dscrThreshold: thresholds.dscrMin,
    dscrBreached: dscr !== null ? dscr < thresholds.dscrMin : null,
  };
}
