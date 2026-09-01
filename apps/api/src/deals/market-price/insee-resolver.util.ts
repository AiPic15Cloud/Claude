import { Logger } from '@nestjs/common';

const logger = new Logger('InseeResolver');

interface AddressSearchFeature {
  properties: { citycode: string };
}
interface AddressSearchResponse {
  features: AddressSearchFeature[];
}

/**
 * Résout une requête ville/arrondissement vers son code INSEE — même API
 * officielle (api-adresse.data.gouv.fr, Base Adresse Nationale) et même
 * doctrine de dégradation que DvfSearchService.resolveCommune() : un échec
 * renvoie null, jamais une exception qui casse la recherche. Certains sites
 * (baromètre des notaires, Journal du Net) identifient une commune par son
 * code INSEE dans l'URL plutôt que par un slug de nom — leurs sélecteurs
 * de contenu restent, eux, non vérifiés (cf. market-price-extractor.util.ts).
 */
export async function resolveInseeCode(query: string): Promise<string | null> {
  try {
    const res = await fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=1`, {
      headers: { 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; recherche prix marché)' },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) {
      logger.warn(`Adresse (BAN) search responded ${res.status} for "${query}"`);
      return null;
    }
    const json = (await res.json()) as AddressSearchResponse;
    return json.features?.[0]?.properties.citycode ?? null;
  } catch (error) {
    logger.warn(`Adresse (BAN) search failed for "${query}": ${(error as Error).message}`);
    return null;
  }
}
