export type RawObservationStatus = 'A_VENIR' | 'EN_COLLECTE' | 'CLOTURE' | 'RETIRE';

/** Une observation de projet telle qu'extraite d'une page (spec ATLAS v2, C.3 — "Project Observation"), avant persistance. */
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
}
