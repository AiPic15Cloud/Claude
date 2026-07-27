import { Injectable, Logger } from '@nestjs/common';

interface GeocodeResult {
  lat: number;
  lng: number;
}

interface BanFeature {
  geometry: { coordinates: [number, number] };
}

interface BanResponse {
  features: BanFeature[];
}

/**
 * Free, keyless geocoding against the French government's official Base
 * Adresse Nationale (BAN) API — the same reference data used by French
 * public administrations. Only real, resolvable addresses ever produce
 * coordinates; anything unresolved returns null rather than a guess.
 */
@Injectable()
export class GeocodingService {
  private readonly logger = new Logger(GeocodingService.name);

  async geocode(input: { address?: string | null; city?: string | null; postcode?: string | null }): Promise<GeocodeResult | null> {
    const q = [input.address, input.postcode, input.city].filter(Boolean).join(' ').trim();
    if (!q) return null;

    const params = new URLSearchParams({ q, limit: '1' });
    if (input.postcode) params.set('postcode', input.postcode);
    const url = `https://api-adresse.data.gouv.fr/search/?${params.toString()}`;

    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) {
        this.logger.warn(`BAN geocoding responded ${res.status} for "${q}"`);
        return null;
      }
      const body = (await res.json()) as BanResponse;
      const feature = body.features?.[0];
      if (!feature) return null;

      const [lng, lat] = feature.geometry.coordinates;
      return { lat, lng };
    } catch (error) {
      this.logger.warn(`BAN geocoding failed for "${q}": ${(error as Error).message}`);
      return null;
    }
  }
}
