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

// Checklist progressive (spec Cockpit/Fractionné P1 §5.6/§4.1) — remplace le
// traitement à plat des 48 pièces (même poids, même urgence quelle que soit
// l'étape, dénoncé explicitement par la spec) par 3 paliers cumulatifs :
// une pièce "avant présentation" reste due à l'étape "avant acquisition".
export type DataRoomItemTier = 'NOW' | 'BEFORE_PRESENTATION' | 'BEFORE_ACQUISITION';
export const DATA_ROOM_ITEM_TIER_ORDER: DataRoomItemTier[] = ['NOW', 'BEFORE_PRESENTATION', 'BEFORE_ACQUISITION'];
export const DATA_ROOM_ITEM_TIER_LABELS: Record<DataRoomItemTier, string> = {
  NOW: 'Maintenant',
  BEFORE_PRESENTATION: 'Avant présentation',
  BEFORE_ACQUISITION: 'Avant acquisition',
};

export interface DataRoomItemDefinition {
  itemKey: string;
  label: string;
  tier: DataRoomItemTier;
}

export interface DataRoomBlockDefinition {
  label: string;
  items: DataRoomItemDefinition[];
}

export const DATA_ROOM_BLOCKS: Record<DataRoomBlockKey, DataRoomBlockDefinition> = {
  CORPORATE_KYC: {
    label: 'Corporate / KYC',
    items: [
      { itemKey: 'kbis', label: 'Kbis', tier: 'NOW' },
      { itemKey: 'statuts', label: 'Statuts', tier: 'NOW' },
      { itemKey: 'beneficiairesEffectifs', label: 'Bénéficiaires effectifs', tier: 'NOW' },
      { itemKey: 'organigramme', label: 'Organigramme', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'pouvoirs', label: 'Pouvoirs', tier: 'BEFORE_PRESENTATION' },
    ],
  },
  TITLE_LEGAL: {
    label: 'Title / Legal',
    items: [
      { itemKey: 'titrePropriete', label: 'Titre de propriété', tier: 'NOW' },
      { itemKey: 'cadastre', label: 'Cadastre', tier: 'NOW' },
      { itemKey: 'servitudes', label: 'Servitudes', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'hypotheques', label: 'Hypothèques', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'contentieux', label: 'Contentieux', tier: 'BEFORE_PRESENTATION' },
    ],
  },
  LEASES: {
    label: 'Leases',
    items: [
      { itemKey: 'baux', label: 'Baux', tier: 'NOW' },
      { itemKey: 'avenants', label: 'Avenants', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'garanties', label: 'Garanties', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'depots', label: 'Dépôts', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'quittancement', label: 'Quittancement', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'impayes', label: 'Impayés', tier: 'BEFORE_PRESENTATION' },
    ],
  },
  TECHNICAL: {
    label: 'Technical',
    items: [
      { itemKey: 'diagnostics', label: 'Diagnostics', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'plans', label: 'Plans', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'doe', label: 'DOE', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'controlesReglementaires', label: 'Contrôles réglementaires', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'sinistres', label: 'Sinistres', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'capexHistorique', label: 'CAPEX historique', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'conformite', label: 'Conformité', tier: 'BEFORE_ACQUISITION' },
    ],
  },
  ENVIRONMENTAL_ESG: {
    label: 'Environmental / ESG',
    items: [
      { itemKey: 'dpeEnergie', label: 'DPE / Énergie', tier: 'NOW' },
      { itemKey: 'operat', label: 'OPERAT (si applicable)', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'pollutionSols', label: 'Pollution des sols', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'risquesNaturelsTechnologiques', label: 'Risques naturels / technologiques', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'consommations', label: 'Consommations', tier: 'BEFORE_PRESENTATION' },
    ],
  },
  FINANCIAL: {
    label: 'Financial',
    items: [
      { itemKey: 'prix', label: 'Prix', tier: 'NOW' },
      { itemKey: 'taxesFoncieres', label: 'Taxes foncières', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'charges', label: 'Charges', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'budgets', label: 'Budgets', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'facturesTravaux', label: 'Factures travaux', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'assurance', label: 'Assurance', tier: 'BEFORE_ACQUISITION' },
    ],
  },
  MARKET: {
    label: 'Market',
    items: [
      { itemKey: 'compsLoyers', label: 'Comparables loyers', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'compsVentes', label: 'Comparables ventes', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'tauxCapitalisation', label: 'Taux de capitalisation', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'vacance', label: 'Vacance', tier: 'NOW' },
    ],
  },
  VALUATION: {
    label: 'Valuation',
    items: [
      { itemKey: 'expertiseIndependante', label: 'Expertise indépendante', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'methode', label: 'Méthode', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'date', label: 'Date', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'hypotheses', label: 'Hypothèses', tier: 'BEFORE_PRESENTATION' },
    ],
  },
  VEHICLE_PLATFORM: {
    label: 'Vehicle / Platform',
    items: [
      { itemKey: 'termSheet', label: 'Term sheet', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'frais', label: 'Frais', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'obligationsActions', label: 'Obligations / actions', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'waterfall', label: 'Waterfall', tier: 'BEFORE_PRESENTATION' },
      { itemKey: 'gouvernance', label: 'Gouvernance', tier: 'BEFORE_ACQUISITION' },
      { itemKey: 'sortie', label: 'Sortie', tier: 'BEFORE_ACQUISITION' },
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
  tier: DataRoomItemTier;
  status: FractionalDataRoomItemStatusValue;
  notes: string | null;
}

export interface DataRoomTierResult {
  tier: DataRoomItemTier;
  /** Cumulatif : "avant acquisition" inclut aussi les pièces "maintenant" et "avant présentation" — un palier franchi reste dû. */
  total: number;
  obtainedCount: number;
  completenessPct: number;
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
  /** Complétude par palier cumulatif (spec §5.6 : "pièces nécessaires maintenant, avant présentation, avant acquisition"). */
  tiers: DataRoomTierResult[];
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
  const tierStats: Record<DataRoomItemTier, { obtained: number; applicableTotal: number }> = {
    NOW: { obtained: 0, applicableTotal: 0 },
    BEFORE_PRESENTATION: { obtained: 0, applicableTotal: 0 },
    BEFORE_ACQUISITION: { obtained: 0, applicableTotal: 0 },
  };

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

      if (status !== 'NOT_APPLICABLE') {
        // Cumulatif : un item "NOW" compte aussi dans les paliers ultérieurs
        // — franchir une étape ne rend jamais une pièce antérieure due
        // "de nouveau non requise".
        const itemTierIndex = DATA_ROOM_ITEM_TIER_ORDER.indexOf(itemDef.tier);
        for (let i = itemTierIndex; i < DATA_ROOM_ITEM_TIER_ORDER.length; i++) {
          const tier = DATA_ROOM_ITEM_TIER_ORDER[i];
          tierStats[tier].applicableTotal += 1;
          if (status === 'OBTAINED') tierStats[tier].obtained += 1;
        }
      }

      if (status === 'MISSING') missingItems.push({ block: blockKey, blockLabel: blockDef.label, itemKey: itemDef.itemKey, label: itemDef.label, notes });
      if (status === 'INCONSISTENT') inconsistentItems.push({ block: blockKey, blockLabel: blockDef.label, itemKey: itemDef.itemKey, label: itemDef.label, notes });

      return { block: blockKey, itemKey: itemDef.itemKey, label: itemDef.label, tier: itemDef.tier, status, notes };
    });

    const total = blockDef.items.length;
    const applicableTotal = total - notApplicableCount;
    const completenessPct = applicableTotal > 0 ? Math.round((obtainedCount / applicableTotal) * 100) : 100;

    overallObtained += obtainedCount;
    overallApplicableTotal += applicableTotal;

    return { block: blockKey, label: blockDef.label, total, obtainedCount, missingCount, notApplicableCount, inconsistentCount, completenessPct, items };
  });

  const overallCompletenessPct = overallApplicableTotal > 0 ? Math.round((overallObtained / overallApplicableTotal) * 100) : 100;
  const tiers: DataRoomTierResult[] = DATA_ROOM_ITEM_TIER_ORDER.map((tier) => {
    const { obtained, applicableTotal } = tierStats[tier];
    return { tier, total: applicableTotal, obtainedCount: obtained, completenessPct: applicableTotal > 0 ? Math.round((obtained / applicableTotal) * 100) : 100 };
  });

  return { overallCompletenessPct, blocks, missingItems, inconsistentItems, tiers };
}
