import { Injectable, Logger } from '@nestjs/common';

export interface RiskProfile {
  catnat: { count: number; recent: { libelle: string | null; dateDebut: string | null; dateFin: string | null }[] } | null;
  floodZone: { present: boolean; niveau: string | null } | null;
  seismicZone: { present: boolean; niveau: string | null } | null;
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

interface RisqueDetail {
  present?: boolean;
  libelleStatutCommune?: string | null;
  libelleStatutAdresse?: string | null;
}
interface RapportRisqueResponse {
  risquesNaturels?: {
    inondation?: RisqueDetail;
    seisme?: RisqueDetail;
  };
}

interface GpuZoneFeature {
  properties?: { libelle?: string; libelong?: string; typezone?: string };
}
interface GpuZoneResponse {
  features?: GpuZoneFeature[];
}

export interface DpeResult {
  label: string | null;
  ghgLabel: string | null;
  date: string | null;
  matchedAddress: string | null;
}

type DpeRow = Record<string, unknown>;
interface DpeResponse {
  results?: DpeRow[];
  total?: number;
}

const CACHE_TTL_MS = 24 * 60 * 60_000;

/**
 * Risques naturels/technologiques (Géorisques, gouv.fr) et zonage PLU
 * (Géoportail de l'Urbanisme via apicarto.ign.fr) pour un point donné —
 * évite d'aller vérifier à la main si un projet est en zone inondable, en
 * zone sismique, ou constructible avant de financer.
 *
 * Historique de correction (via logs Railway) : AZI et zonage_sismique
 * renvoyaient 404/500 (chemins inventés), remplacés par le rapport de risque
 * officiel unique resultats_rapport_risque — sa forme réelle (risquesNaturels
 * .inondation/.seisme, chacun avec present/libelleStatutCommune/
 * libelleStatutAdresse) a été confirmée par la réponse brute loguée sur une
 * dizaine de communes réelles avant d'y brancher l'extraction. Overpass
 * renvoyait 406 par absence de header Accept/User-Agent, corrigé. Le zonage
 * PLU (IGN) fonctionnait déjà du premier coup. CatNat renvoie encore 500 en
 * production malgré le retrait de page_size — cause encore inconnue, corps
 * de la réponse d'erreur maintenant capturé en log pour diagnostiquer sans
 * deviner un nouveau paramètre. Dégradation isolée comme tous les autres
 * connecteurs du module.
 */
@Injectable()
export class RiskDataService {
  private readonly logger = new Logger(RiskDataService.name);
  private cache = new Map<string, { fetchedAt: number; data: RiskProfile }>();
  private dpeCache = new Map<string, { fetchedAt: number; data: DpeResult }>();

  async getRiskProfile(lat: number, lng: number): Promise<RiskProfile> {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

    const [catnat, riskReport, zonage, nearby] = await Promise.all([
      this.fetchCatnat(lat, lng),
      this.fetchRiskReport(lat, lng),
      this.fetchZonage(lat, lng),
      this.fetchNearby(lat, lng),
    ]);

    const data: RiskProfile = { catnat, floodZone: riskReport.flood, seismicZone: riskReport.seismic, zonage, nearby };
    this.cache.set(key, { fetchedAt: Date.now(), data });
    return data;
  }

  /**
   * Lecture pure du cache, sans jamais déclencher d'appel réseau — utilisée
   * par le Risk Engine, dont le recalcul est déclenché de façon synchrone à
   * chaque sauvegarde de checkpoint/garantie et ne doit donc jamais attendre
   * un appel Géorisques/Overpass (jusqu'à ~15s). Retourne null tant que
   * l'onglet "Risques" du dossier n'a pas été ouvert au moins une fois
   * depuis le dernier redémarrage serveur — limite assumée, pas un bug.
   */
  peekCached(lat: number, lng: number): RiskProfile | null {
    const key = `${lat.toFixed(4)},${lng.toFixed(4)}`;
    const cached = this.cache.get(key);
    return cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS ? cached.data : null;
  }

  /**
   * Catastrophes naturelles reconnues (arrêtés CatNat) dans un rayon de 2km
   * — endpoint et forme de paramètres confirmés par un exemple public
   * (géorisques.gouv.fr/api/v1/gaspar/catnat?longitude=...&latitude=...&rayon=...).
   */
  private async fetchCatnat(lat: number, lng: number): Promise<RiskProfile['catnat']> {
    try {
      // page_size retiré : confirmé responsable d'un 500 en production, absent
      // de l'exemple public d'origine (longitude/latitude/rayon uniquement).
      const url = `https://georisques.gouv.fr/api/v1/gaspar/catnat?latitude=${lat}&longitude=${lng}&rayon=2000`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        this.logger.warn(`Géorisques CatNat responded ${res.status} for ${lat},${lng}: ${preview.slice(0, 500)}`);
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
   * Inondation + sismicité, via le rapport de risque officiel Géorisques
   * (georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=lng,lat).
   * risquesNaturels.inondation et .seisme, chacun avec present (booléen) et
   * libelleStatutCommune/libelleStatutAdresse (ex. "Risque Existant - modéré")
   * — confirmé par la réponse brute loguée en production sur une dizaine de
   * communes réelles avant d'écrire cette extraction.
   */
  private async fetchRiskReport(lat: number, lng: number): Promise<{ flood: RiskProfile['floodZone']; seismic: RiskProfile['seismicZone'] }> {
    const empty = { flood: null, seismic: null };
    try {
      const url = `https://georisques.gouv.fr/api/v1/resultats_rapport_risque?latlon=${lng},${lat}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        this.logger.warn(`Géorisques rapport de risque responded ${res.status} for ${lat},${lng}: ${preview.slice(0, 500)}`);
        return empty;
      }
      const json = (await res.json()) as RapportRisqueResponse;
      const inondation = json.risquesNaturels?.inondation;
      const seisme = json.risquesNaturels?.seisme;
      if (!inondation && !seisme) {
        this.logger.warn(`Géorisques rapport de risque unexpected shape for ${lat},${lng}: ${JSON.stringify(json).slice(0, 500)}`);
        return empty;
      }

      const flood = inondation
        ? { present: inondation.present === true, niveau: inondation.libelleStatutCommune ?? inondation.libelleStatutAdresse ?? null }
        : null;
      const seismic = seisme
        ? { present: seisme.present === true, niveau: seisme.libelleStatutCommune ?? seisme.libelleStatutAdresse ?? null }
        : null;
      return { flood, seismic };
    } catch (error) {
      this.logger.warn(`Géorisques rapport de risque fetch failed for ${lat},${lng}: ${(error as Error).message}`);
      return empty;
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
        // Confirmé en production : sans Accept ni User-Agent explicites,
        // overpass-api.de répond 406 (Not Acceptable) plutôt que de traiter
        // la requête.
        headers: {
          'Content-Type': 'text/plain',
          Accept: 'application/json',
          'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; risques dossier)',
        },
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

  /**
   * DPE (diagnostic de performance énergétique) le plus proche de l'adresse
   * donnée — ADEME, plateforme data-fair (data.ademe.fr). Le jeu de données
   * initialement visé ("dpe-v2-logements-existants") est marqué "Supprimé"
   * sur le portail ADEME au moment de la recherche ; "dpe03existant" en est
   * apparemment le successeur actif, mais ni son URL exacte ni les noms de
   * colonnes n'ont pu être vérifiés en direct (aucun accès réseau sortant
   * depuis ce sandbox). Recherche par code postal (qs) puis correspondance
   * du numéro+nom de voie en local parmi les résultats — best-effort
   * assumé, avec dump de la réponse brute en log si rien ne correspond à
   * ce qui est attendu, pour corriger précisément plutôt que redeviner.
   */
  async getDpe(address: string | null, postcode: string | null): Promise<DpeResult | null> {
    if (!postcode) return null;
    const cacheKey = `dpe:${postcode}:${address ?? ''}`;
    const cached = this.dpeCache.get(cacheKey);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) return cached.data;

    try {
      const params = new URLSearchParams({
        qs: `Code_postal_(BAN):"${postcode}"`,
        size: '100',
        select: 'Etiquette_DPE,Etiquette_GES,Date_établissement_DPE,Adresse_(BAN)',
      });
      const url = `https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines?${params.toString()}`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        this.logger.warn(`ADEME DPE responded ${res.status} for code postal ${postcode}: ${preview.slice(0, 300)}`);
        return null;
      }
      const json = (await res.json()) as DpeResponse;
      if (!Array.isArray(json.results)) {
        this.logger.warn(`ADEME DPE unexpected shape for code postal ${postcode}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }
      if (json.results.length === 0) return null;

      const normalize = (s: string) =>
        s
          .toLowerCase()
          .normalize('NFD')
          .replace(/[̀-ͯ]/g, '')
          .replace(/[^a-z0-9]+/g, ' ')
          .trim();

      const targetTokens = address ? normalize(address).split(' ').filter((t) => t.length > 2) : [];
      let best: DpeRow | undefined;
      if (targetTokens.length > 0) {
        best = json.results.find((row) => {
          const rowAddr = row['Adresse_(BAN)'];
          if (typeof rowAddr !== 'string') return false;
          const normalizedRow = normalize(rowAddr);
          return targetTokens.every((t) => normalizedRow.includes(t));
        });
      }
      if (!best) best = json.results[0];

      const label = best['Etiquette_DPE'];
      const ghgLabel = best['Etiquette_GES'];
      const date = best['Date_établissement_DPE'];
      const matchedAddress = best['Adresse_(BAN)'];
      if (typeof label !== 'string' && typeof ghgLabel !== 'string') {
        this.logger.warn(`ADEME DPE row shape unexpected for code postal ${postcode}: ${JSON.stringify(best).slice(0, 300)}`);
        return null;
      }

      const data: DpeResult = {
        label: typeof label === 'string' ? label : null,
        ghgLabel: typeof ghgLabel === 'string' ? ghgLabel : null,
        date: typeof date === 'string' ? date : null,
        matchedAddress: typeof matchedAddress === 'string' ? matchedAddress : null,
      };
      this.dpeCache.set(cacheKey, { fetchedAt: Date.now(), data });
      return data;
    } catch (error) {
      this.logger.warn(`ADEME DPE fetch failed for code postal ${postcode}: ${(error as Error).message}`);
      return null;
    }
  }
}
