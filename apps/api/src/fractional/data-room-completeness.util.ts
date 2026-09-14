import type { FractionalDataRoomItemStatusValue } from '@prisma/client';

/**
 * Data Room Completeness Engine (spec V3.1 §4) — registre fermé de blocs DD
 * et pièces attendues. "Atlas affiche la complétude par bloc et génère
 * automatiquement la liste des éléments manquants ou incohérents" : une
 * pièce sans statut enregistré est MISSING par défaut (Unknown ≠ Zero,
 * même principe que data-confidence.util.ts — jamais "obtenu" par défaut),
 * et NOT_APPLICABLE est exclu du dénominateur de complétude pour ne pas
 * pénaliser un dossier où une pièce ne s'applique pas (ex. OPERAT hors
 * périmètre tertiaire soumis).
 */

export type DataRoomBlockKey =
  | 'CORPORATE_KYC'
  | 'TITLE_LEGAL'
  | 'LEASES'
  | 'TECHNICAL'
  | 'ENVIRONMENTAL_ESG'
  | 'FINANCIAL'
  | 'MARKET'
  | 'VALUATION'
  | 'VEHICLE_PLATFORM';

export interface DataRoomItemDefinition {
  itemKey: string;
  label: string;
}

export interface DataRoomBlockDefinition {
  label: string;
  items: DataRoomItemDefinition[];
}

export const DATA_ROOM_BLOCKS: Record<DataRoomBlockKey, DataRoomBlockDefinition> = {
  CORPORATE_KYC: {
    label: 'Corporate / KYC',
    items: [
      { itemKey: 'kbis', label: 'Kbis' },
      { itemKey: 'statuts', label: 'Statuts' },
      { itemKey: 'beneficiairesEffectifs', label: 'Bénéficiaires effectifs' },
      { itemKey: 'organigramme', label: 'Organigramme' },
      { itemKey: 'pouvoirs', label: 'Pouvoirs' },
    ],
  },
  TITLE_LEGAL: {
    label: 'Title / Legal',
    items: [
      { itemKey: 'titrePropriete', label: 'Titre de propriété' },
      { itemKey: 'cadastre', label: 'Cadastre' },
      { itemKey: 'servitudes', label: 'Servitudes' },
      { itemKey: 'hypotheques', label: 'Hypothèques' },
      { itemKey: 'contentieux', label: 'Contentieux' },
    ],
  },
  LEASES: {
    label: 'Leases',
    items: [
      { itemKey: 'baux', label: 'Baux' },
      { itemKey: 'avenants', label: 'Avenants' },
      { itemKey: 'garanties', label: 'Garanties' },
      { itemKey: 'depots', label: 'Dépôts' },
      { itemKey: 'quittancement', label: 'Quittancement' },
      { itemKey: 'impayes', label: 'Impayés' },
    ],
  },
  TECHNICAL: {
    label: 'Technical',
    items: [
      { itemKey: 'diagnostics', label: 'Diagnostics' },
      { itemKey: 'plans', label: 'Plans' },
      { itemKey: 'doe', label: 'DOE' },
      { itemKey: 'controlesReglementaires', label: 'Contrôles réglementaires' },
      { itemKey: 'sinistres', label: 'Sinistres' },
      { itemKey: 'capexHistorique', label: 'CAPEX historique' },
      { itemKey: 'conformite', label: 'Conformité' },
    ],
  },
  ENVIRONMENTAL_ESG: {
    label: 'Environmental / ESG',
    items: [
      { itemKey: 'dpeEnergie', label: 'DPE / Énergie' },
      { itemKey: 'operat', label: 'OPERAT (si applicable)' },
      { itemKey: 'pollutionSols', label: 'Pollution des sols' },
      { itemKey: 'risquesNaturelsTechnologiques', label: 'Risques naturels / technologiques' },
      { itemKey: 'consommations', label: 'Consommations' },
    ],
  },
  FINANCIAL: {
    label: 'Financial',
    items: [
      { itemKey: 'prix', label: 'Prix' },
      { itemKey: 'taxesFoncieres', label: 'Taxes foncières' },
      { itemKey: 'charges', label: 'Charges' },
      { itemKey: 'budgets', label: 'Budgets' },
      { itemKey: 'facturesTravaux', label: 'Factures travaux' },
      { itemKey: 'assurance', label: 'Assurance' },
    ],
  },
  MARKET: {
    label: 'Market',
    items: [
      { itemKey: 'compsLoyers', label: 'Comparables loyers' },
      { itemKey: 'compsVentes', label: 'Comparables ventes' },
      { itemKey: 'tauxCapitalisation', label: 'Taux de capitalisation' },
      { itemKey: 'vacance', label: 'Vacance' },
    ],
  },
  VALUATION: {
    label: 'Valuation',
    items: [
      { itemKey: 'expertiseIndependante', label: 'Expertise indépendante' },
      { itemKey: 'methode', label: 'Méthode' },
      { itemKey: 'date', label: 'Date' },
      { itemKey: 'hypotheses', label: 'Hypothèses' },
    ],
  },
  VEHICLE_PLATFORM: {
    label: 'Vehicle / Platform',
    items: [
      { itemKey: 'termSheet', label: 'Term sheet' },
      { itemKey: 'frais', label: 'Frais' },
      { itemKey: 'obligationsActions', label: 'Obligations / actions' },
      { itemKey: 'waterfall', label: 'Waterfall' },
      { itemKey: 'gouvernance', label: 'Gouvernance' },
      { itemKey: 'sortie', label: 'Sortie' },
    ],
  },
};

export interface DataRoomItemStatusLike {
  block: string;
  itemKey: string;
  status: FractionalDataRoomItemStatusValue;
  notes?: string | null;
}

export interface DataRoomItemResult {
  block: DataRoomBlockKey;
  itemKey: string;
  label: string;
  status: FractionalDataRoomItemStatusValue;
  notes: string | null;
}

export interface DataRoomBlockResult {
  block: DataRoomBlockKey;
  label: string;
  total: number;
  obtainedCount: number;
  missingCount: number;
  notApplicableCount: number;
  inconsistentCount: number;
  completenessPct: number;
  items: DataRoomItemResult[];
}

export interface DataRoomFlaggedItem {
  block: DataRoomBlockKey;
  blockLabel: string;
  itemKey: string;
  label: string;
  notes: string | null;
}

export interface DataRoomCompletenessResult {
  overallCompletenessPct: number;
  blocks: DataRoomBlockResult[];
  missingItems: DataRoomFlaggedItem[];
  inconsistentItems: DataRoomFlaggedItem[];
}

function statusKey(block: string, itemKey: string): string {
  return `${block}:${itemKey}`;
}

export function computeDataRoomCompleteness(statuses: DataRoomItemStatusLike[]): DataRoomCompletenessResult {
  const byKey = new Map(statuses.map((s) => [statusKey(s.block, s.itemKey), s]));

  const missingItems: DataRoomFlaggedItem[] = [];
  const inconsistentItems: DataRoomFlaggedItem[] = [];

  let overallObtained = 0;
  let overallApplicableTotal = 0;

  const blocks: DataRoomBlockResult[] = (Object.keys(DATA_ROOM_BLOCKS) as DataRoomBlockKey[]).map((blockKey) => {
    const blockDef = DATA_ROOM_BLOCKS[blockKey];

    let obtainedCount = 0;
    let missingCount = 0;
    let notApplicableCount = 0;
    let inconsistentCount = 0;

    const items: DataRoomItemResult[] = blockDef.items.map((itemDef) => {
      const record = byKey.get(statusKey(blockKey, itemDef.itemKey));
      const status: FractionalDataRoomItemStatusValue = record?.status ?? 'MISSING';
      const notes = record?.notes ?? null;

      if (status === 'OBTAINED') obtainedCount += 1;
      else if (status === 'NOT_APPLICABLE') notApplicableCount += 1;
      else if (status === 'INCONSISTENT') inconsistentCount += 1;
      else missingCount += 1;

      if (status === 'MISSING') missingItems.push({ block: blockKey, blockLabel: blockDef.label, itemKey: itemDef.itemKey, label: itemDef.label, notes });
      if (status === 'INCONSISTENT') inconsistentItems.push({ block: blockKey, blockLabel: blockDef.label, itemKey: itemDef.itemKey, label: itemDef.label, notes });

      return { block: blockKey, itemKey: itemDef.itemKey, label: itemDef.label, status, notes };
    });

    const total = blockDef.items.length;
    const applicableTotal = total - notApplicableCount;
    const completenessPct = applicableTotal > 0 ? Math.round((obtainedCount / applicableTotal) * 100) : 100;

    overallObtained += obtainedCount;
    overallApplicableTotal += applicableTotal;

    return { block: blockKey, label: blockDef.label, total, obtainedCount, missingCount, notApplicableCount, inconsistentCount, completenessPct, items };
  });

  const overallCompletenessPct = overallApplicableTotal > 0 ? Math.round((overallObtained / overallApplicableTotal) * 100) : 100;

  return { overallCompletenessPct, blocks, missingItems, inconsistentItems };
}
