/**
 * Data room dynamique (spec ATLAS "Moteur de préqualification" v1.0, §14) —
 * moteur pur, registre fermé de règles (même doctrine que
 * `eliminatory-rule.util.ts` : jamais un champ libre évalué dynamiquement).
 * "ATLAS ne doit pas générer une liste générique complète lorsque seules
 * trois réponses sont nécessaires pour décider de poursuivre" (spec §14,
 * littéral) — chaque bloc conditionnel n'est suggéré QUE si une donnée déjà
 * saisie au dossier le rend pertinent, jamais les 8 blocs par défaut.
 */

export type DataRoomBlock =
  | 'identite'
  | 'travaux'
  | 'urbanisme'
  | 'division'
  | 'parcellaire'
  | 'commercialisation'
  | 'acquisition_conditionnelle'
  | 'revenus_locatifs'
  | 'autres_plateformes';

export const DATA_ROOM_BLOCK_LABELS: Record<DataRoomBlock, string> = {
  identite: 'Identité & solvabilité',
  travaux: 'Travaux',
  urbanisme: 'Urbanisme',
  division: 'Division',
  parcellaire: 'Parcellaire',
  commercialisation: 'Commercialisation',
  acquisition_conditionnelle: 'Acquisition conditionnelle',
  revenus_locatifs: 'Revenus locatifs',
  autres_plateformes: 'Autres plateformes',
};

export interface DataRoomSuggestion {
  block: DataRoomBlock;
  reason: string;
  documents: string[];
}

export interface PrequalDataRoomInput {
  worksDescription: string | null;
  createdSurfaceSqm: number | null;
  projectType: string | null;
  lotCount: number | null;
  acquisitionStatus: string | null;
  salesLotsCount: number;
  interimRevenueNote: string | null;
  otherRevenueRetained: number | null;
  externalFinancingsCount: number;
}

const URBANISME_PROJECT_TYPES = ['RESIDENTIAL_DEVELOPMENT', 'BUILDING_DIVISION', 'COMMERCIAL_PROPERTY'];

/**
 * Le bloc "identité" (spec §14, "blocs communs") est toujours pertinent —
 * seuls les 8 blocs suivants ("blocs conditionnels") sont soumis à une
 * condition explicite sur des données déjà saisies au dossier.
 */
export function suggestDataRoomBlocks(input: PrequalDataRoomInput): DataRoomSuggestion[] {
  const suggestions: DataRoomSuggestion[] = [
    {
      block: 'identite',
      reason: 'Bloc commun à tout dossier de préqualification.',
      documents: ['CV / pièce d’identité', 'Justificatif de domicile', 'Justificatif des fonds propres', 'Kbis', 'Comptes annuels', 'Relevés bancaires et dette'],
    },
  ];

  if (input.worksDescription || input.projectType === 'PROPERTY_TRADING_WITH_WORKS') {
    suggestions.push({
      block: 'travaux',
      reason: 'Des travaux sont décrits dans le profil du projet.',
      documents: ['Devis', 'Factures', 'Planning travaux', "Attestations d'assurance", 'Liste des intervenants'],
    });
  }

  if (input.createdSurfaceSqm !== null || URBANISME_PROJECT_TYPES.includes(input.projectType ?? '')) {
    suggestions.push({
      block: 'urbanisme',
      reason: 'Surface créée renseignée, ou opération de construction/division nécessitant une autorisation.',
      documents: ["Dépôt d'autorisation", 'Autorisation obtenue', 'Affichage réglementaire', 'Attestation de purge des recours'],
    });
  }

  if (input.projectType === 'BUILDING_DIVISION' || (input.lotCount ?? 0) > 1) {
    suggestions.push({
      block: 'division',
      reason: 'Division en plusieurs lots prévue.',
      documents: ['Plans de division', 'Rapport de géomètre', 'Règlement de copropriété', 'Répartition des compteurs'],
    });
  }

  if (input.projectType === 'LAND_DIVISION') {
    suggestions.push({
      block: 'parcellaire',
      reason: 'Opération de division parcellaire.',
      documents: ["Certificat d'urbanisme", 'Déclaration préalable', 'Bornage', 'Servitudes et réseaux'],
    });
  }

  if (input.salesLotsCount > 0) {
    suggestions.push({
      block: 'commercialisation',
      reason: 'La grille de commercialisation contient déjà des lots.',
      documents: ['Mandats de commercialisation', 'Offres reçues', 'Réservations', 'PUV', "Justificatif de financement acquéreur"],
    });
  }

  if (input.acquisitionStatus === 'OFFRE' || input.acquisitionStatus === 'PROMESSE') {
    suggestions.push({
      block: 'acquisition_conditionnelle',
      reason: `Acquisition non encore actée (statut : ${input.acquisitionStatus}).`,
      documents: ['Justificatif de maîtrise foncière', 'Calendrier de réitération'],
    });
  }

  if (input.interimRevenueNote || input.otherRevenueRetained !== null) {
    suggestions.push({
      block: 'revenus_locatifs',
      reason: 'Des revenus intermédiaires pendant le portage sont mentionnés.',
      documents: ['Baux en cours', 'Quittances de loyer', 'État locatif (vacance, charges)'],
    });
  }

  if (input.externalFinancingsCount > 0) {
    suggestions.push({
      block: 'autres_plateformes',
      reason: `${input.externalFinancingsCount} financement(s) confirmé(s) identifié(s) sur d'autres plateformes.`,
      documents: ['Contrats de financement existants', 'Montants et échéances', 'Statut des remboursements'],
    });
  }

  return suggestions;
}
