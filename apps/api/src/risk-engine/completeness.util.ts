import type { GuaranteeType } from '@prisma/client';

export interface MissingItem {
  key: string;
  label: string;
}

export interface CompletenessResult {
  missingCount: number;
  missingItems: MissingItem[];
}

export interface CompletenessInput {
  hasFinancialModel: boolean;
  bpLocked: boolean;
  daysSinceLastCheckpoint: number | null;
  porteurSiren: string | null;
  porteurMonitoringStatus: string | null;
  guarantees: { type: GuaranteeType; endDate: Date | null }[];
}

const EXPIRABLE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION'];

/**
 * Moteur de complétude minimal (section 5 du brief "Le Traçotin") : un compte
 * réel de lacunes d'information, construit à partir de données déjà
 * assemblées par RiskEngineService.computeDealRisk() — aucune nouvelle
 * requête. Volontairement limité à ce qui est vérifiable aujourd'hui sans
 * fabriquer de donnée (ex. "type de procédure renseigné" du brief n'a pas de
 * champ correspondant dans le schéma — pas inclus ici plutôt que deviné).
 *
 * C'est un rapport de qualité de donnée, pas un facteur de risque : une
 * lacune ici dégrade la confiance qu'on peut avoir dans le score, elle ne
 * modifie jamais le score financier lui-même.
 */
export function computeCompleteness(input: CompletenessInput): CompletenessResult {
  const missingItems: MissingItem[] = [];

  if (!input.hasFinancialModel) {
    missingItems.push({ key: 'FINANCIAL_MODEL_ABSENT', label: 'Aucun modèle financier renseigné' });
  } else if (!input.bpLocked) {
    missingItems.push({ key: 'BP_NON_FIGE', label: 'Business plan non figé — pas de comparaison réel/prévu possible' });
  }

  if (input.daysSinceLastCheckpoint === null) {
    missingItems.push({ key: 'SUIVI_CHANTIER_ABSENT', label: 'Aucun point de suivi chantier/commercialisation enregistré' });
  }

  if (!input.porteurSiren) {
    missingItems.push({ key: 'SIREN_NON_RENSEIGNE', label: 'SIREN du porteur non renseigné' });
  } else if (input.porteurMonitoringStatus === null) {
    missingItems.push({ key: 'PORTEUR_JAMAIS_VERIFIE', label: 'SIREN renseigné mais jamais vérifié (SIRENE/BODACC)' });
  }

  if (input.guarantees.some((g) => EXPIRABLE_TYPES.includes(g.type) && g.endDate === null)) {
    missingItems.push({ key: 'GARANTIE_SANS_DATE', label: 'Au moins une sûreté sans date de fin renseignée' });
  }

  return { missingCount: missingItems.length, missingItems };
}
