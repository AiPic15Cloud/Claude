import type { SitePriceSiteConfig } from './site-price-connector';
import { resolveInseeCode } from './insee-resolver.util';

/**
 * Les 6 sources primaires de C.8 (spec ATLAS v2).
 *
 * Statut de vérification par source, mis à jour après un premier test en
 * conditions réelles (le proxy sortant de la session de développement
 * bloque ces domaines — voir market-price-extractor.util.ts) :
 * - Efficity, Meilleurs Agents : URL confirmée par recherche indexée
 *   (motifs réels observés : "v_{ville}_{postcode}", "{ville}-{postcode}").
 * - Le baromètre des notaires, Journal du Net : identifient une commune
 *   par code INSEE dans l'URL, pas par un slug de nom — confirmé par
 *   recherche indexée. Résolu ici via resolveInseeCode() (même API
 *   officielle que DvfSearchService).
 * - SeLoger : URL réelle confirmée comme un chemin hiérarchique
 *   région/département/ville/code (ex. "ile-de-france/hauts-de-seine/
 *   suresnes/920073.htm") — trop de segments à reconstruire de façon
 *   fiable sans référentiel région/département ; URL ci-dessous reste une
 *   approximation non confirmée. Attention par ailleurs déjà signalée par
 *   la spec elle-même : SeLoger (groupe AVIV) historiquement restrictif
 *   sur la réutilisation de ses données, quelle que soit l'URL exacte.
 * - Le Figaro Immobilier : aucune page de prix au m² par ville n'a pu être
 *   localisée, même par recherche indexée — le service existe peut-être
 *   sous une autre forme ou a été retiré. URL ci-dessous reste une
 *   hypothèse non confirmée.
 *
 * Le parsing de contenu (JSON-LD / motifs textuels,
 * market-price-extractor.util.ts) reste non vérifié pour les 6 sources —
 * seule l'existence et la forme de l'URL a pu être confirmée par
 * recherche, jamais le contenu réel de la page (accès direct bloqué
 * depuis cet environnement).
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
    buildUrl: ({ query }) => `https://immobilier.lefigaro.fr/prix-immobilier/${slugify(query)}`,
  },
  {
    source: 'Efficity',
    buildUrl: ({ query, postcode }) => `https://www.efficity.com/prix-immobilier-m2/v_${slugify(query)}_${postcode ?? ''}/`,
  },
  {
    source: 'Journal du Net',
    buildUrl: async ({ query }) => {
      const insee = await resolveInseeCode(query);
      return insee
        ? `https://www.journaldunet.com/patrimoine/prix-immobilier/${slugify(query)}/ville-${insee}`
        : `https://www.journaldunet.com/patrimoine/prix-immobilier/${slugify(query)}/`;
    },
  },
  {
    source: 'Le baromètre des notaires',
    buildUrl: async ({ query }) => {
      const insee = await resolveInseeCode(query);
      return insee
        ? `https://www.immobilier.notaires.fr/fr/prix-immobilier?typeLocalisation=COMMUNE&codeInsee=${insee}`
        : `https://www.immobilier.notaires.fr/fr/prix-immobilier?typeLocalisation=COMMUNE&q=${encodeURIComponent(query)}`;
    },
  },
  {
    source: 'SeLoger',
    buildUrl: ({ query, postcode }) => `https://www.seloger.com/prix-de-l-immo/vente/${slugify(query)}${postcode ? `-${postcode}` : ''}.htm`,
  },
  {
    source: 'Meilleurs Agents',
    buildUrl: ({ query, postcode }) => `https://www.meilleursagents.com/prix-immobilier/${slugify(query)}-${postcode ?? ''}/`,
  },
];
