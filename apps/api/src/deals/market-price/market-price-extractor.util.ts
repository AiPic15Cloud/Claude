/**
 * Extraction générique d'une fourchette de prix au m² depuis une page HTML
 * (spec ATLAS v2, C.8). Contrairement aux connecteurs existants
 * (dvf-search.service.ts consomme un CSV officiel structuré,
 * barometer.connector.ts a été écrit contre une capture réelle d'une page
 * Next.js précise), aucune des 6 pages ciblées ici n'a pu être observée
 * depuis cet environnement (accès direct bloqué par le proxy sortant,
 * confirmé sur efficity.com/notaires.fr). Écrire un extracteur "confiant"
 * spécifique à chaque site serait donc de l'invention, pas de l'ingénierie
 * — cet extracteur reste volontairement générique (JSON-LD standard SEO
 * puis motifs textuels français courants), à vérifier et durcir site par
 * site une fois déployé dans un environnement avec accès réel.
 *
 * Ne retourne jamais une valeur inventée : si aucune des deux méthodes ne
 * trouve un triplet bas/moyen/haut cohérent, retourne null — le connecteur
 * appelant traduit ça en source "non disponible" (jamais un zéro silencieux).
 */

export interface ExtractedPriceRange {
  priceLow: number;
  priceMid: number;
  priceHigh: number;
}

/** Bornes de sanité pour un prix au m² en France métropolitaine — élimine les faux positifs évidents (ex. un numéro de téléphone confondu avec un prix). */
const MIN_PLAUSIBLE_PRICE_PER_SQM = 200;
const MAX_PLAUSIBLE_PRICE_PER_SQM = 30_000;

function isPlausible(value: number): boolean {
  return Number.isFinite(value) && value >= MIN_PLAUSIBLE_PRICE_PER_SQM && value <= MAX_PLAUSIBLE_PRICE_PER_SQM;
}

function parsePriceToken(raw: string): number | null {
  const cleaned = raw.replace(/[\s ]/g, '').replace(',', '.');
  const value = Number(cleaned);
  return isPlausible(value) ? value : null;
}

export function extractPriceRange(html: string): ExtractedPriceRange | null {
  return extractFromJsonLd(html) ?? extractFromLabeledText(html);
}

/**
 * De nombreuses pages d'estimation immobilière exposent un bloc JSON-LD
 * (schema.org AggregateOffer/Offer) pour le référencement — lowPrice/
 * highPrice/price y sont des champs standards, indépendants de la mise en
 * page visuelle et donc plus stables qu'un sélecteur CSS.
 */
function extractFromJsonLd(html: string): ExtractedPriceRange | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const parsed: unknown = JSON.parse(block[1]);
      const range = findAggregateOffer(parsed);
      if (range) return range;
    } catch {
      // Bloc JSON-LD malformé ou inattendu — on continue avec les suivants.
    }
  }
  return null;
}

function findAggregateOffer(node: unknown, depth = 0): ExtractedPriceRange | null {
  if (depth > 6 || node === null || typeof node !== 'object') return null;

  if (Array.isArray(node)) {
    for (const item of node) {
      const found = findAggregateOffer(item, depth + 1);
      if (found) return found;
    }
    return null;
  }

  const record = node as Record<string, unknown>;
  const low = numberField(record.lowPrice);
  const high = numberField(record.highPrice);
  if (low !== null && high !== null && isPlausible(low) && isPlausible(high)) {
    const mid = numberField(record.price) ?? Math.round((low + high) / 2);
    return { priceLow: Math.min(low, high), priceMid: mid, priceHigh: Math.max(low, high) };
  }

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = findAggregateOffer(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

function numberField(value: unknown): number | null {
  if (typeof value === 'number') return Number.isFinite(value) ? value : null;
  if (typeof value === 'string') return parsePriceToken(value);
  return null;
}

const PRICE_PER_SQM_PATTERN = /(\d[\d\s .,]{1,8})\s?€\s?\/?\s?m(?:2|²)/i;
const SEARCH_WINDOW_CHARS = 300;

function findPriceNearLabel(html: string, labels: string[]): number | null {
  const haystack = html.toLowerCase();
  for (const label of labels) {
    let fromIndex = 0;
    while (true) {
      const labelIndex = haystack.indexOf(label, fromIndex);
      if (labelIndex === -1) break;
      const window = html.slice(labelIndex, labelIndex + SEARCH_WINDOW_CHARS);
      const match = window.match(PRICE_PER_SQM_PATTERN);
      if (match) {
        const value = parsePriceToken(match[1]);
        if (value !== null) return value;
      }
      fromIndex = labelIndex + label.length;
    }
  }
  return null;
}

/** Repli texte brut : motifs français usuels sur les pages d'estimation, sans hypothèse de structure HTML précise. */
function extractFromLabeledText(html: string): ExtractedPriceRange | null {
  const low = findPriceNearLabel(html, ['prix bas', 'prix minimum', 'fourchette basse', 'estimation basse']);
  const mid = findPriceNearLabel(html, ['prix moyen', 'prix médian', 'estimation moyenne']);
  const high = findPriceNearLabel(html, ['prix haut', 'prix maximum', 'fourchette haute', 'estimation haute']);
  if (low === null || mid === null || high === null) return null;
  return { priceLow: Math.min(low, mid, high), priceMid: mid, priceHigh: Math.max(low, mid, high) };
}
