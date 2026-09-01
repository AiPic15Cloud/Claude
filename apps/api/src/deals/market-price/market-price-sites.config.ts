import type { SitePriceSiteConfig } from './site-price-connector';

/**
 * Les 6 sources primaires de C.8 (spec ATLAS v2). URLs construites sur la
 * meilleure hypothèse disponible (conventions publiques connues de ces
 * sites) — NON VÉRIFIÉES contre le HTML réel depuis cet environnement
 * (accès direct bloqué par le proxy sortant de la session, confirmé sur
 * efficity.com/notaires.fr). À confirmer et ajuster une fois déployé, avant
 * toute décision basée sur ces chiffres — voir market-price-extractor.util.ts
 * pour la même réserve côté parsing. Le comportement de dégradation
 * ("non disponible") de site-price-connector.ts rend ce risque sans danger
 * fonctionnel en attendant cette vérification.
 */

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export const MARKET_PRICE_SITE_CONFIGS: SitePriceSiteConfig[] = [
  {
    source: 'Le Figaro Immobilier',
    buildUrl: (query) => `https://immobilier.lefigaro.fr/prix-immobilier/${slugify(query)}`,
  },
  {
    source: 'Efficity',
    buildUrl: (query) => `https://www.efficity.com/prix-immobilier-m2/${slugify(query)}/`,
  },
  {
    source: 'Journal du Net',
    buildUrl: (query) => `https://immobilier.journaldunet.com/prix-immobilier/ville-${slugify(query)}/`,
  },
  {
    source: 'Le baromètre des notaires',
    buildUrl: (query) => `https://www.immobilier.notaires.fr/fr/prix-immobilier/${slugify(query)}`,
  },
  {
    source: 'SeLoger',
    buildUrl: (query) => `https://www.seloger.com/prix-de-l-immo/vente/${slugify(query)}.htm`,
  },
  {
    source: 'Meilleurs Agents',
    buildUrl: (query) => `https://www.meilleursagents.com/prix-immobilier/${slugify(query)}/`,
  },
];
