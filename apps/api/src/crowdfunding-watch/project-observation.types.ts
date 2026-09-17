export type RawObservationStatus = 'A_VENIR' | 'EN_COLLECTE' | 'CLOTURE' | 'RETIRE';

/**
 * Une observation de projet telle qu'extraite d'une page (spec ATLAS v2,
 * C.3 ; dates séparées spec Lot 1 §2-3), avant persistance. `status` reste
 * la seule source de vérité sur l'état d'ouverture — toujours dérivé d'un
 * indicateur textuel explicite trouvé sur la source (voir
 * project-observation-extractor.util.ts), jamais d'une comparaison de date.
 * `announcedOpeningAt` est conservée séparément et n'est jamais traitée
 * comme une preuve d'ouverture.
 */
export interface RawProjectObservation {
  projectName: string;
  projectUrl: string;
  operatorRaw: string | null;
  amountTarget: number | null;
  ratePct: number | null;
  durationMonths: number | null;
  sourceCategory: string | null;
  location: string | null;
  status: RawObservationStatus;
  publishedAt: Date | null;
  announcedOpeningAt: Date | null;
}
