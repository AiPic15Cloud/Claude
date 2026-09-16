import { Logger } from '@nestjs/common';
import { fetchPublicHttpUrl, SsrfBlockedUrlError } from '../../common/security/ssrf-guard.util';
import { extractProjectObservations } from '../project-observation-extractor.util';
import type { RawProjectObservation } from '../project-observation.types';

const logger = new Logger('PlatformConnector');

export interface PlatformFetchResult {
  sourceKey: string;
  success: boolean;
  observations: RawProjectObservation[];
  error?: string;
}

/**
 * Interrogation d'une plateforme de crowdfunding (spec Lot 1 §1) — même
 * doctrine que market-price-connector.ts (C.8) : fetch natif, timeout,
 * jamais d'exception qui remonte à l'appelant. Un échec dégrade toujours
 * vers `success: false, observations: []`, jamais une observation inventée.
 *
 * `listingUrl` est désormais une valeur admin-configurable (registre en
 * base, CrowdfundingPlatform) plutôt qu'une constante développeur — passe
 * donc par fetchPublicHttpUrl (garde SSRF) plutôt qu'un `fetch()` nu, à la
 * différence de l'ancien pilote dont les 5 URLs étaient figées dans le code.
 */
export async function fetchPlatformListing(sourceKey: string, label: string, listingUrl: string): Promise<PlatformFetchResult> {
  try {
    const res = await fetchPublicHttpUrl(listingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      logger.warn(`${label} a répondu HTTP ${res.status}`);
      return { sourceKey, success: false, observations: [], error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const observations = extractProjectObservations(html);
    if (observations.length === 0) {
      logger.warn(`${label} : aucune observation reconnue — page accessible mais structure non identifiée (ou aucun projet publié).`);
    }
    return { sourceKey, success: true, observations };
  } catch (error) {
    const message = error instanceof SsrfBlockedUrlError ? `URL de registre invalide/non autorisée : ${error.message}` : (error as Error).message;
    logger.warn(`${label} : échec de la requête — ${message}`);
    return { sourceKey, success: false, observations: [], error: message };
  }
}
