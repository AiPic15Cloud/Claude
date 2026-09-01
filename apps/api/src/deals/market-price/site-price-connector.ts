import { Logger } from '@nestjs/common';
import { extractPriceRange } from './market-price-extractor.util';
import type { MarketPriceTypology, SourcePriceResult } from './market-price.types';

const logger = new Logger('SitePriceConnector');

export interface SitePriceQueryContext {
  query: string;
  /** Code postal résolu du dossier (ou de l'arrondissement) — certains sites en ont besoin dans l'URL, d'autres non. */
  postcode: string | null;
  typology: MarketPriceTypology;
}

export interface SitePriceSiteConfig {
  source: string;
  /** Async autorisé : certains sites identifient une commune par code INSEE plutôt que par un slug de nom (cf. insee-resolver.util.ts). */
  buildUrl(context: SitePriceQueryContext): string | Promise<string>;
}

/**
 * Interrogation générique d'un site externe pour C.8 — même doctrine que
 * dvf-search.service.ts/barometer.connector.ts : fetch natif, timeout,
 * jamais d'exception qui remonte à l'appelant. Un échec (HTTP, timeout, ou
 * structure de page non reconnue) dégrade toujours vers "non disponible",
 * jamais vers une valeur inventée ou une source silencieusement omise.
 */
export async function fetchSitePrice(config: SitePriceSiteConfig, context: SitePriceQueryContext): Promise<SourcePriceResult> {
  const unavailable = (error: string): SourcePriceResult => ({
    source: config.source,
    available: false,
    priceLow: null,
    priceMid: null,
    priceHigh: null,
    error,
  });

  let url: string;
  try {
    url = await config.buildUrl(context);
  } catch (error) {
    return unavailable(`URL de recherche non construite : ${(error as Error).message}`);
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      logger.warn(`${config.source} a répondu HTTP ${res.status} pour "${context.query}" (${url})`);
      return unavailable(`HTTP ${res.status}`);
    }

    const html = await res.text();
    const range = extractPriceRange(html);
    if (!range) {
      logger.warn(`${config.source} : structure de page non reconnue pour "${context.query}" — sélecteurs à vérifier.`);
      return unavailable("Ce site n'a pas pu être interrogé, réessayer ou vérifier manuellement.");
    }

    return { source: config.source, available: true, ...range };
  } catch (error) {
    logger.warn(`${config.source} : échec de la requête pour "${context.query}" — ${(error as Error).message}`);
    return unavailable((error as Error).message);
  }
}
