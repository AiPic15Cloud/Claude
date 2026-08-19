import { Injectable, Logger } from '@nestjs/common';

export interface RiskProfile {
  catnat: { count: number; recent: { libelle: string | null; dateDebut: string | null; dateFin: string | null }[] } | null;
  floodZone: { count: number } | null;
  seismicZone: { zone: string | null } | null;
  zonage: { type: string | null; libelle: string | null }[] | null;
  nearby: { schools: number; healthcare: number; shops: number; transitStops: number } | null;
}

interface CatnatRow {
  libelle_risque_jo?: string;
  date_debut_evt?: string;
  date_fin_evt?: string;
}
interface CatnatResponse {
  data?: CatnatRow[];
  total?: number;
}

interface AziResponse {
  data?: unknown[];
  total?: number;
}

interface ZonageSismiqueRow {
  zone_sismicite?: string;
  code_zone?: string;
}
interface ZonageSismiqueResponse {
  data?: ZonageSismiqueRow[];
}

interface GpuZoneFeature {
  properties?: { libelle?: string; libelong?: string; typezone?: string };
}
interface GpuZoneResponse {
  features?: GpuZoneFeature[];
}

const CACHE_TTL_MS = 24 * 60 * 60_000;

/**
 * Risques naturels/technologiques (Géorisques, gouv.fr) et zonage PLU
 * (Géoportail de l'Urbanisme via apicarto.ign.fr) pour un point donné —
 * évite d'aller vérifier à la main si un projet est en zone inondable, en
 * zone sismique, ou constructible avant de financer.
 *
 * Confiance très inégale entre les quatre appels, documentée endpoint par
 * endpoint ci-dessous : aucun n'a pu être vérifié en direct depuis ce
 * sandbox (accès réseau sortant bloqué), donc dégradation isolée comme tous
 * les autres connecteurs du module et réponse brute loguée en cas de forme
 * inattendue.
 */
@Injectable()
export class RiskDataService {
  private readonly logger = new Logger(RiskDataService.name);
  private cache = new Map<string, { fetchedAt: number; data: RiskProfile }>();

  async getRiskProfile(lat: number, lng: number): Promise<RiskProfile> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

    const [catnat, floodZone, seismicZone, zonage, nearby] = await Promise.all([
      this.fetchCatnat(lat, lng),
      this.fetchFloodZone(lat, lng),
      this.fetchSeismicZone(lat, lng),
      this.fetchZonage(lat, lng),
      this.fetchNearby(lat, lng),
    ]);

    const data: RiskProfile = { catnat, floodZone, seismicZone, zonage, nearby };
    this.cache.set(key, { fetchedAt: Date.now(), data });
    return data;
  }

  /**
   * Catastrophes naturelles reconnues (arrêtés CatNat) dans un rayon de 2km
   * — endpoint et forme de paramètres confirmés par un exemple public
   * (géorisques.gouv.fr/api/v1/gaspar/catnat?longitude=...&latitude=...&rayon=...).
   */
  private async fetchCatnat(lat: number, lng: number): Promise<RiskProfile['catnat']> {
    try {
      const url = `https://georisques.gouv.fr/api/v1/gaspar/catnat?latitude=${lat}&longitude=${lng}&rayon=2000&page_size=10`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`Géorisques CatNat responded ${res.status} for ${lat},${lng}`);
        return null;
      }
      const json = (await res.json()) as CatnatResponse;
      if (!Array.isArray(json.data)) {
        this.logger.warn(`Géorisques CatNat unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }
      return {
        count: json.total ?? json.data.length,
        recent: json.data.slice(0, 5).map((r) => ({
          libelle: r.libelle_risque_jo ?? null,
          dateDebut: r.date_debut_evt ?? null,
          dateFin: r.date_fin_evt ?? null,
        })),
      };
    } catch (error) {
      this.logger.warn(`Géorisques CatNat fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Atlas des zones inondables — endpoint existe (géorisques.gouv.fr/api/v1/azi)
   * mais les paramètres exacts (lat/lng/rayon vs. code_insee) n'ont pas pu être
   * confirmés par un exemple public ; best-effort par cohérence avec l'endpoint
   * CatNat ci-dessus, qui partage la même famille d'API.
   */
  private async fetchFloodZone(lat: number, lng: number): Promise<RiskProfile['floodZone']> {
    try {
      const url = `https://georisques.gouv.fr/api/v1/azi?latitude=${lat}&longitude=${lng}&rayon=500&page_size=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`Géorisques AZI responded ${res.status} for ${lat},${lng}`);
        return null;
      }
      const json = (await res.json()) as AziResponse;
      if (!Array.isArray(json.data)) {
        this.logger.warn(`Géorisques AZI unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }
      return { count: json.total ?? json.data.length };
    } catch (error) {
      this.logger.warn(`Géorisques AZI fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return null;
    }
  }

  /** Zonage sismique réglementaire (1 à 5) — mêmes réserves que fetchFloodZone ci-dessus sur les paramètres exacts. */
  private async fetchSeismicZone(lat: number, lng: number): Promise<RiskProfile['seismicZone']> {
    try {
      const url = `https://georisques.gouv.fr/api/v1/zonage_sismique?latitude=${lat}&longitude=${lng}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`Géorisques zonage sismique responded ${res.status} for ${lat},${lng}`);
        return null;
      }
      const json = (await res.json()) as ZonageSismiqueResponse;
      const row = json.data?.[0];
      if (!row) {
        this.logger.warn(`Géorisques zonage sismique unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }
      return { zone: row.zone_sismicite ?? row.code_zone ?? null };
    } catch (error) {
      this.logger.warn(`Géorisques zonage sismique fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Zonage PLU (constructible / agricole / naturel...) — endpoint et format
   * confirmés par recherche (apicarto.ign.fr/api/gpu/zone-urba, gratuit,
   * sans clé, actif en 2026).
   */
  private async fetchZonage(lat: number, lng: number): Promise<RiskProfile['zonage']> {
    try {
      const geom = JSON.stringify({ type: 'Point', coordinates: [lng, lat] });
      const url = `https://apicarto.ign.fr/api/gpu/zone-urba?geom=${encodeURIComponent(geom)}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        this.logger.warn(`API Carto GPU responded ${res.status} for ${lat},${lng}`);
        return null;
      }
      const json = (await res.json()) as GpuZoneResponse;
      if (!Array.isArray(json.features)) {
        this.logger.warn(`API Carto GPU unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }
      return json.features.map((f) => ({
        type: f.properties?.typezone ?? null,
        libelle: f.properties?.libelong ?? f.properties?.libelle ?? null,
      }));
    } catch (error) {
      this.logger.warn(`API Carto GPU fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return null;
    }
  }

  /**
   * Équipements à proximité (écoles, santé, commerces, arrêts de transport)
   * via Overpass API (OpenStreetMap) — syntaxe Overpass QL standard et
   * stable, instance publique overpass-api.de. Le seul des cinq connecteurs
   * de ce fichier dont la syntaxe est réellement bien établie (documentation
   * OSM inchangée depuis des années), même si toujours non testé en direct
   * faute de réseau sortant depuis ce sandbox.
   */
  private async fetchNearby(lat: number, lng: number): Promise<RiskProfile['nearby']> {
    const query = `[out:json][timeout:15];(
      node["amenity"~"^(school|college|university)$"](around:1000,${lat},${lng});
      node["amenity"~"^(pharmacy|hospital|clinic|doctors)$"](around:1000,${lat},${lng});
      node["shop"](around:500,${lat},${lng});
      node["highway"="bus_stop"](around:400,${lat},${lng});
      node["railway"~"^(station|halt|tram_stop)$"](around:1200,${lat},${lng});
    );out tags;`;
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain' },
        body: query,
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) {
        this.logger.warn(`Overpass responded ${res.status} for ${lat},${lng}`);
        return null;
      }
      const json = (await res.json()) as { elements?: { type?: string; tags?: Record<string, string> }[] };
      const elements = json.elements ?? [];
      if (elements.length === 0 && !Array.isArray(json.elements)) {
        this.logger.warn(`Overpass unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }

      let schools = 0;
      let healthcare = 0;
      let shops = 0;
      let transitStops = 0;
      for (const el of elements) {
        const tags = el.tags ?? {};
        if (/^(school|college|university)$/.test(tags.amenity ?? '')) schools += 1;
        else if (/^(pharmacy|hospital|clinic|doctors)$/.test(tags.amenity ?? '')) healthcare += 1;
        else if (tags.shop) shops += 1;
        else if (tags.highway === 'bus_stop' || /^(station|halt|tram_stop)$/.test(tags.railway ?? '')) transitStops += 1;
      }
      return { schools, healthcare, shops, transitStops };
    } catch (error) {
      this.logger.warn(`Overpass fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return null;
    }
  }
}
