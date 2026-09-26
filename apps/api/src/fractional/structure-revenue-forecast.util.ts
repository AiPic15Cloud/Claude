import type { EconomicsNegotiationStatus } from '@prisma/client';

/**
 * Prévision des flux de la structure (spec Cockpit/Fractionné P2 §5.5) — la
 * prévision de revenus distingue réalisé/contractualisé/proposé/hypothétique,
 * jamais un chiffre unique qui masquerait où en est réellement chaque frais.
 *
 * "Réalisé" n'a pas de suivi dédié par partie prenante dans le modèle
 * actuel (FractionalProjectActual est au niveau de l'actif, pas ventilé par
 * bénéficiaire) — plutôt que d'inventer un chiffre non tracé, une échéance
 * CONTRACTUALISEE déjà passée est traitée comme réalisée (engagement
 * contractuel honoré), une échéance à venir reste "contractualisée" (flux
 * futur, pas encore perçu). PROPOSEE et A_NEGOCIER restent hypothétiques par
 * construction, quelle que soit l'année.
 *
 * Un frais au taux (ratePct) sans assiette calculée disponible ici n'est
 * jamais estimé au hasard : son montant reste `null` ("non calculable"),
 * exclu de la somme mais compté séparément (`unquantifiedCount`) — Unknown
 * ≠ Zero.
 */

export type RevenueForecastCategory = 'REALISE' | 'CONTRACTUALISE' | 'PROPOSE' | 'HYPOTHETIQUE';

export interface StructureFeeInput {
  id: string;
  projectId: string;
  projectName: string;
  stakeholderId: string;
  stakeholderName: string;
  feeType: string;
  ratePct: number | null;
  fixedAmount: number | null;
  startYear: number | null;
  endYear: number | null;
  negotiationStatus: EconomicsNegotiationStatus;
}

export interface StructureFeeForecastLine {
  feeDefinitionId: string;
  projectName: string;
  stakeholderName: string;
  feeType: string;
  category: RevenueForecastCategory;
  amountEur: number | null;
}

export interface StructureRevenueForecastResult {
  year: number;
  lines: StructureFeeForecastLine[];
  totalsByCategory: Record<RevenueForecastCategory, number>;
  unquantifiedCount: number;
}

function isActiveInYear(fee: StructureFeeInput, year: number): boolean {
  if (fee.startYear !== null && year < fee.startYear) return false;
  if (fee.endYear !== null && year > fee.endYear) return false;
  return true;
}

function categorize(fee: StructureFeeInput, year: number): RevenueForecastCategory {
  if (fee.negotiationStatus === 'A_NEGOCIER') return 'HYPOTHETIQUE';
  if (fee.negotiationStatus === 'PROPOSEE') return 'PROPOSE';
  // CONTRACTUALISEE
  return year < new Date().getFullYear() ? 'REALISE' : 'CONTRACTUALISE';
}

export function computeStructureRevenueForecast(fees: StructureFeeInput[], year: number): StructureRevenueForecastResult {
  const active = fees.filter((f) => isActiveInYear(f, year));

  const lines: StructureFeeForecastLine[] = active.map((f) => ({
    feeDefinitionId: f.id,
    projectName: f.projectName,
    stakeholderName: f.stakeholderName,
    feeType: f.feeType,
    category: categorize(f, year),
    amountEur: f.fixedAmount,
  }));

  const totalsByCategory: Record<RevenueForecastCategory, number> = { REALISE: 0, CONTRACTUALISE: 0, PROPOSE: 0, HYPOTHETIQUE: 0 };
  let unquantifiedCount = 0;
  for (const line of lines) {
    if (line.amountEur === null) {
      unquantifiedCount += 1;
      continue;
    }
    totalsByCategory[line.category] += line.amountEur;
  }

  return { year, lines, totalsByCategory, unquantifiedCount };
}
