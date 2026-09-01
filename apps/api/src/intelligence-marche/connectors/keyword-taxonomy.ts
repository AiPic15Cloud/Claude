import { ArticleCategory } from '@prisma/client';

const CATEGORY_KEYWORDS: [ArticleCategory, string[]][] = [
  ['TAUX', ['taux', 'bce', 'banque centrale']],
  ['INFLATION', ['inflation']],
  ['CONSTRUCTION', ['construction', 'permis de construire', 'btp', 'chantier']],
  ['LOGISTIQUE', ['logistique', 'entrepôt']],
  ['COMMERCE', ['commerce', 'bureaux', 'retail']],
  ['RESIDENTIEL', ['résidentiel', 'logement', 'location']],
  ['REGLEMENTATION', ['loi', 'décret', 'réglementation', 'fiscalité']],
  ['IMMOBILIER', ['immobilier', 'foncier', 'crowdfunding']],
];

export function inferCategory(text: string): ArticleCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return ArticleCategory.AUTRE;
}

// Union of every category keyword, plus a few real-estate terms that aren't
// category-distinguishing on their own — used to filter general-purpose
// feeds (a publisher's whole "Économie" desk) down to relevant items. A
// search RSS like Google News' can be queried by topic; a fixed publisher
// feed can't, so relevance has to be judged after the fact instead.
const RELEVANCE_KEYWORDS = [
  ...new Set(CATEGORY_KEYWORDS.flatMap(([, keywords]) => keywords)),
  'promoteur',
  'sci',
  'scpi',
  'crédit immobilier',
];

export function isRealEstateRelevant(text: string): boolean {
  const lower = text.toLowerCase();
  return RELEVANCE_KEYWORDS.some((k) => lower.includes(k));
}
