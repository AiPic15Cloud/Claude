import type { FractionalLegalTaxItemStatusValue } from '@prisma/client';

/**
 * Legal, Planning & Tax DD Engine (spec V3.1 §13) — registre fermé des SEULS
 * sous-blocs non déjà couverts ailleurs dans Atlas : Titre → Data Room bloc
 * TITLE_LEGAL, Environnement → Data Room + Technical DD sous-bloc
 * ENVIRONNEMENT, Baux → lease-legal-review.util.ts, Assurance → Technical DD
 * sous-bloc ASSURANCE. Dupliquer ces 4 blocs ici romprait le Single Source
 * of Truth. Chaque item du registre porte son type de professionnel requis
 * en cas de réserve ("Atlas signale ce qui nécessite validation par avocat,
 * notaire, fiscaliste, expert technique ou expert immobilier, il ne
 * remplace pas ces professionnels").
 */

export type LegalTaxProfessional = 'AVOCAT' | 'NOTAIRE' | 'FISCALISTE' | 'EXPERT_TECHNIQUE' | 'EXPERT_IMMOBILIER';

export const LEGAL_TAX_PROFESSIONAL_LABELS: Record<LegalTaxProfessional, string> = {
  AVOCAT: 'Avocat',
  NOTAIRE: 'Notaire',
  FISCALISTE: 'Fiscaliste',
  EXPERT_TECHNIQUE: 'Expert technique',
  EXPERT_IMMOBILIER: 'Expert immobilier',
};

export type LegalTaxBlockKey = 'URBANISME' | 'FISCALITE_VEHICULE' | 'CONTENTIEUX';

export interface LegalTaxItemDefinition {
  itemKey: string;
  label: string;
  professional: LegalTaxProfessional;
}

export interface LegalTaxBlockDefinition {
  label: string;
  items: LegalTaxItemDefinition[];
}

export const LEGAL_TAX_BLOCKS: Record<LegalTaxBlockKey, LegalTaxBlockDefinition> = {
  URBANISME: {
    label: 'Urbanisme',
    items: [
      { itemKey: 'zonage', label: 'Zonage', professional: 'EXPERT_IMMOBILIER' },
      { itemKey: 'permis', label: 'Permis', professional: 'NOTAIRE' },
      { itemKey: 'conformiteUsage', label: "Conformité d'usage", professional: 'AVOCAT' },
      { itemKey: 'destination', label: 'Destination', professional: 'NOTAIRE' },
      { itemKey: 'constructibilite', label: 'Constructibilité', professional: 'EXPERT_IMMOBILIER' },
    ],
  },
  FISCALITE_VEHICULE: {
    label: 'Fiscalité véhicule',
    items: [
      { itemKey: 'regimeIs', label: 'IS / transparence', professional: 'FISCALISTE' },
      { itemKey: 'retenuesSource', label: 'Retenues à la source', professional: 'FISCALISTE' },
      { itemKey: 'fiscaliteDistributions', label: 'Fiscalité des distributions', professional: 'FISCALISTE' },
    ],
  },
  CONTENTIEUX: {
    label: 'Contentieux',
    items: [
      { itemKey: 'contentieuxActif', label: "Contentieux liés à l'actif", professional: 'AVOCAT' },
      { itemKey: 'contentieuxProprietaire', label: 'Contentieux propriétaire', professional: 'AVOCAT' },
      { itemKey: 'contentieuxLocataires', label: 'Contentieux locataires', professional: 'AVOCAT' },
      { itemKey: 'contentieuxSpv', label: 'Contentieux SPV', professional: 'AVOCAT' },
    ],
  },
};

export interface LegalTaxItemStatusLike {
  block: string;
  itemKey: string;
  status: FractionalLegalTaxItemStatusValue;
  notes?: string | null;
}

export interface LegalTaxItemResult {
  block: LegalTaxBlockKey;
  itemKey: string;
  label: string;
  professional: LegalTaxProfessional;
  status: FractionalLegalTaxItemStatusValue;
  notes: string | null;
}

export interface LegalTaxBlockResult {
  block: LegalTaxBlockKey;
  label: string;
  total: number;
  nonControleCount: number;
  conformeCount: number;
  reserveCount: number;
  items: LegalTaxItemResult[];
}

export interface LegalTaxValidationNeeded {
  block: LegalTaxBlockKey;
  blockLabel: string;
  itemKey: string;
  label: string;
  professional: LegalTaxProfessional;
  notes: string | null;
}

export interface LegalTaxDdSummary {
  blocks: LegalTaxBlockResult[];
  validationNeeded: LegalTaxValidationNeeded[];
}

function statusKey(block: string, itemKey: string): string {
  return `${block}:${itemKey}`;
}

export function computeLegalTaxDdSummary(statuses: LegalTaxItemStatusLike[]): LegalTaxDdSummary {
  const byKey = new Map(statuses.map((s) => [statusKey(s.block, s.itemKey), s]));

  const validationNeeded: LegalTaxValidationNeeded[] = [];

  const blocks: LegalTaxBlockResult[] = (Object.keys(LEGAL_TAX_BLOCKS) as LegalTaxBlockKey[]).map((blockKey) => {
    const blockDef = LEGAL_TAX_BLOCKS[blockKey];

    let nonControleCount = 0;
    let conformeCount = 0;
    let reserveCount = 0;

    const items: LegalTaxItemResult[] = blockDef.items.map((itemDef) => {
      const record = byKey.get(statusKey(blockKey, itemDef.itemKey));
      const status: FractionalLegalTaxItemStatusValue = record?.status ?? 'NON_CONTROLE';
      const notes = record?.notes ?? null;

      if (status === 'CONFORME') conformeCount += 1;
      else if (status === 'RESERVE') {
        reserveCount += 1;
        validationNeeded.push({ block: blockKey, blockLabel: blockDef.label, itemKey: itemDef.itemKey, label: itemDef.label, professional: itemDef.professional, notes });
      } else nonControleCount += 1;

      return { block: blockKey, itemKey: itemDef.itemKey, label: itemDef.label, professional: itemDef.professional, status, notes };
    });

    return { block: blockKey, label: blockDef.label, total: blockDef.items.length, nonControleCount, conformeCount, reserveCount, items };
  });

  return { blocks, validationNeeded };
}
