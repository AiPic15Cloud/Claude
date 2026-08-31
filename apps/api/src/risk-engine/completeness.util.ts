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
  guarantees: { type: GuaranteeType; endDate: Date | null; verifiedAt: Date | null }[];
  /**
   * null = pas de procédure collective ouverte pour ce dossier — rien à
   * signaler (jamais un manque fabriqué sur un dossier sain, doctrine
   * section 0). Non-null uniquement quand un PlaybookInstance existe.
   */
  procedureCollective: { typeIdentified: boolean; declarationCreanceFaite: boolean } | null;
}

const EXPIRABLE_TYPES: GuaranteeType[] = ['HYPOTHEQUE', 'FIDUCIE', 'CAUTION'];
const GUARANTEE_VERIFICATION_THRESHOLD_DAYS = 30;
const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Moteur de complétude (section 5 du brief "Le Traçotin" + spec ATLAS v2,
 * A.5) : un compte réel de lacunes d'information, construit à partir de
 * données déjà assemblées par RiskEngineService.computeDealRisk() — aucune
 * nouvelle requête pour la plupart des champs. Les 2 checks "procédure
 * collective" viennent des tâches du playbook A.4 (identifier_type_procedure,
 * declaration_creance) plutôt que d'un champ dédié — la donnée existe déjà,
 * jamais dupliquée.
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

  const now = Date.now();
  const unverifiedCount = input.guarantees.filter(
    (g) => g.verifiedAt === null || (now - g.verifiedAt.getTime()) / DAY_MS > GUARANTEE_VERIFICATION_THRESHOLD_DAYS,
  ).length;
  if (unverifiedCount > 0) {
    missingItems.push({
      key: 'SURETES_NON_VERIFIEES',
      label: `${unverifiedCount} sûreté(s) non vérifiée(s) depuis ${GUARANTEE_VERIFICATION_THRESHOLD_DAYS} jours`,
    });
  }

  if (input.procedureCollective !== null) {
    if (!input.procedureCollective.typeIdentified) {
      missingItems.push({ key: 'TYPE_PROCEDURE_NON_IDENTIFIE', label: 'Type de procédure collective non identifié' });
    }
    if (!input.procedureCollective.declarationCreanceFaite) {
      missingItems.push({ key: 'DECLARATION_CREANCE_NON_FAITE', label: 'Déclaration de créance non faite' });
    }
  }

  return { missingCount: missingItems.length, missingItems };
}
