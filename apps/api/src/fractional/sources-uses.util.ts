/**
 * Acquisition & Sources/Uses Engine (spec V3 §5). Contrôle central : Sources
 * = Uses. coutActeEnMain (prix + droits + honoraires) sert de base à
 * Gross Yield AI / Net Property Yield / Yield on Cost côté returns.util.ts —
 * distinct du coût total (qui inclut travaux/CAPEX/réserves/frais
 * plateforme), utilisé lui pour Yield on Cost.
 */

export interface SourcesUsesInput {
  prixNetVendeur: number;
  droitsNotaire: number;
  honoraires: number;
  travauxInitiaux: number;
  capexDiffereReserve: number;
  fraisPlateformeEntree: number;
  reserveVacance: number;
  reserveTravaux: number;
  reserveTresorerie: number;
  collecteMontant: number;
  sponsorEquity: number;
  detteEventuelle: number;
  autresSources: number;
}

export interface SourcesUsesResult {
  coutActeEnMain: number;
  coutTotal: number;
  usesTotal: number;
  sourcesTotal: number;
  deltaSourcesUses: number;
  /** Écart < 1€ — au-delà, un contrôle de cohérence doit bloquer la validation. */
  balanced: boolean;
}

const BALANCE_TOLERANCE_EUR = 1;

export function computeSourcesUses(input: SourcesUsesInput): SourcesUsesResult {
  const coutActeEnMain = input.prixNetVendeur + input.droitsNotaire + input.honoraires;
  const coutTotal =
    coutActeEnMain +
    input.travauxInitiaux +
    input.capexDiffereReserve +
    input.fraisPlateformeEntree +
    input.reserveVacance +
    input.reserveTravaux +
    input.reserveTresorerie;
  const sourcesTotal = input.collecteMontant + input.sponsorEquity + input.detteEventuelle + input.autresSources;
  const deltaSourcesUses = sourcesTotal - coutTotal;

  return {
    coutActeEnMain,
    coutTotal,
    usesTotal: coutTotal,
    sourcesTotal,
    deltaSourcesUses,
    balanced: Math.abs(deltaSourcesUses) < BALANCE_TOLERANCE_EUR,
  };
}
