import type { DealType } from '@prisma/client';

export type MappingConfidence = 'High' | 'Medium' | 'Low';

export interface TaxonomyMapping {
  atlasSegment: DealType | null;
  mappingConfidence: MappingConfidence | null;
}

/**
 * Normalisation catégorie externe → typologie ATLAS (spec ATLAS v2, C.4).
 * `sourceCategory` (la valeur brute de la plateforme) n'est jamais écrasée
 * par ce mapping — les deux sont conservés séparément en base. Aucune
 * correspondance ne fabrique un segment par défaut : sans mot-clé
 * reconnu, atlasSegment reste null plutôt qu'une supposition.
 */
const KEYWORD_MAP: { keywords: string[]; segment: DealType; confidence: MappingConfidence }[] = [
  { keywords: ['marchand de biens avec travaux', 'mdb avec travaux', 'rénovation lourde'], segment: 'MARCHAND_DE_BIENS_AVEC_TRAVAUX', confidence: 'High' },
  { keywords: ['marchand de biens sans travaux', 'mdb sans travaux'], segment: 'MARCHAND_DE_BIENS_SANS_TRAVAUX', confidence: 'High' },
  { keywords: ['promotion immobilière', 'programme neuf', 'vefa'], segment: 'PROMOTION_IMMOBILIERE', confidence: 'High' },
  { keywords: ['division parcellaire', 'découpe de terrain'], segment: 'DIVISION_PARCELLAIRE', confidence: 'High' },
  { keywords: ['division foncière', 'lotissement'], segment: 'DIVISION_FONCIERE', confidence: 'High' },
  { keywords: ['mise en copropriété'], segment: 'MISE_EN_COPROPRIETE', confidence: 'High' },
  { keywords: ['aménagement foncier', 'aménagement'], segment: 'AMENAGEMENT_FONCIER', confidence: 'Medium' },
  { keywords: ['refinancement fonds propres'], segment: 'REFINANCEMENT_FONDS_PROPRES', confidence: 'High' },
  { keywords: ['refinancement actif'], segment: 'REFINANCEMENT_ACTIF', confidence: 'Medium' },
  { keywords: ['refinancement stock', 'refinancement'], segment: 'REFINANCEMENT_STOCK', confidence: 'Low' },
  { keywords: ['marchand de biens', 'rénovation'], segment: 'MARCHAND_DE_BIENS_AVEC_TRAVAUX', confidence: 'Low' },
];

export function mapSourceCategoryToAtlasSegment(sourceCategory: string | null): TaxonomyMapping {
  if (!sourceCategory) return { atlasSegment: null, mappingConfidence: null };
  const normalized = sourceCategory.trim().toLowerCase();

  for (const entry of KEYWORD_MAP) {
    if (entry.keywords.some((k) => normalized.includes(k))) {
      return { atlasSegment: entry.segment, mappingConfidence: entry.confidence };
    }
  }
  return { atlasSegment: null, mappingConfidence: null };
}
