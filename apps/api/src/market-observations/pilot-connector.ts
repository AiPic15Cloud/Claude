import { Logger } from '@nestjs/common';
import { extractProjectObservations } from './project-observation-extractor.util';
import type { RawProjectObservation } from './project-observation.types';
import type { PilotSourceConfig } from './pilot-sources.config';

const logger = new Logger('PilotConnector');

export interface PilotFetchResult {
  key: string;
  success: boolean;
  observations: RawProjectObservation[];
  error?: string;
}

/**
 * Interrogation d'une source pilote (spec ATLAS v2, C.3) — même doctrine
 * que site-price-connector.ts (C.8) : fetch natif, timeout, jamais
 * d'exception qui remonte à l'appelant. Un échec dégrade toujours vers
 * `success: false, observations: []`, jamais une observation inventée.
 */
export async function fetchPilotSource(config: PilotSourceConfig): Promise<PilotFetchResult> {
  try {
    const res = await fetch(config.listingUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        Accept: 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(12_000),
    });
    if (!res.ok) {
      logger.warn(`${config.label} a répondu HTTP ${res.status}`);
      return { key: config.key, success: false, observations: [], error: `HTTP ${res.status}` };
    }

    const html = await res.text();
    const observations = extractProjectObservations(html);
    if (observations.length === 0) {
      logger.warn(`${config.label} : aucune observation reconnue — page accessible mais structure non identifiée (ou aucun projet publié).`);
    }
    return { key: config.key, success: true, observations };
  } catch (error) {
    logger.warn(`${config.label} : échec de la requête — ${(error as Error).message}`);
    return { key: config.key, success: false, observations: [], error: (error as Error).message };
  }
}
