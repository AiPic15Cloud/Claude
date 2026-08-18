import { Injectable, Logger } from '@nestjs/common';

interface AddressSearchFeature {
  properties: {
    label: string;
    citycode: string;
    postcode: string;
    city: string;
    type: string;
  };
  geometry: { coordinates: [number, number] };
}

interface AddressSearchResponse {
  features: AddressSearchFeature[];
}

interface DvfFeature {
  properties: Record<string, unknown>;
}

interface DvfResponse {
  features: DvfFeature[];
}

/** Cerema apidf responses are plain records (DRF-style), optionally paginated under "results". */
type CeremaRecord = Record<string, unknown>;
interface CeremaResponse {
  results?: CeremaRecord[];
}

export interface DvfTransaction {
  date: string | null;
  address: string | null;
  type: string | null;
  surface: number | null;
  rooms: number | null;
  price: number | null;
  pricePerSqm: number | null;
}

export interface DvfSearchResult {
  query: string;
  commune: { name: string; codeInsee: string; postcode: string } | null;
  transactions: DvfTransaction[];
  averagePricePerSqm: number | null;
  medianPricePerSqm: number | null;
  sampleSize: number;
}

/**
 * Recherche de transactions immobilières comparables — pour éviter d'aller
 * chercher un prix au m² sur SeLoger/MeilleursAgents pour chaque dossier.
 * Deux services publics gratuits, sans clé, enchaînés :
 *
 * 1. api-adresse.data.gouv.fr (Base Adresse Nationale, service officiel de
 *    l'État) — résout une ville/adresse saisie en texte libre vers un code
 *    INSEE commune. Confirmé fonctionnel en production.
 * 2. apidf-preprod.cerema.fr/dvf_opendata (API officielle du Cerema, gratuite,
 *    sans clé pour le flux open-data) — essayée en premier. En repli,
 *    api.cquest.org/dvf (API communautaire) — son propre auteur la décrit
 *    comme un "proof of concept" sans garantie de disponibilité, ce qui a été
 *    confirmé en pratique (0 résultat sur Lyon/Bordeaux, deux villes qui ont
 *    pourtant des milliers de mutations DVF).
 *
 * Aucune des deux formes exactes de réponse n'a pu être vérifiée en direct
 * depuis ce sandbox (accès réseau sortant bloqué) — le detail exact des champs
 * Cerema est une best-effort à partir de leur documentation publique, avec un
 * dump de la réponse brute en log si la forme ne correspond pas, pour corriger
 * précisément au lieu de deviner à nouveau. Dégradation isolée comme tous les
 * autres connecteurs du module : un échec renvoie une liste vide, jamais une
 * erreur qui casse la page.
 */
@Injectable()
export class DvfSearchService {
  private readonly logger = new Logger(DvfSearchService.name);

  async search(query: string): Promise<DvfSearchResult> {
    const commune = await this.resolveCommune(query);
    if (!commune) {
      return { query, commune: null, transactions: [], averagePricePerSqm: null, medianPricePerSqm: null, sampleSize: 0 };
    }

    const transactions = await this.fetchTransactions(commune.codeInsee);
    const pricesPerSqm = transactions.map((t) => t.pricePerSqm).filter((v): v is number => v !== null && v > 0);

    return {
      query,
      commune,
      transactions: transactions.slice(0, 50),
      averagePricePerSqm: pricesPerSqm.length > 0 ? Math.round(pricesPerSqm.reduce((a, b) => a + b, 0) / pricesPerSqm.length) : null,
      medianPricePerSqm: pricesPerSqm.length > 0 ? Math.round(median(pricesPerSqm)) : null,
      sampleSize: pricesPerSqm.length,
    };
  }

  private async resolveCommune(query: string): Promise<{ name: string; codeInsee: string; postcode: string } | null> {
    try {
      const url = `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(query)}&type=municipality&limit=1`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; recherche comparables)' },
        signal: AbortSignal.timeout(8000),
      });
      if (!res.ok) {
        this.logger.warn(`Adresse (BAN) search responded ${res.status} for "${query}"`);
        return null;
      }
      const json = (await res.json()) as AddressSearchResponse;
      const feature = json.features?.[0];
      if (!feature) return null;
      return { name: feature.properties.city, codeInsee: feature.properties.citycode, postcode: feature.properties.postcode };
    } catch (error) {
      this.logger.warn(`Adresse (BAN) search failed for "${query}": ${(error as Error).message}`);
      return null;
    }
  }

  private async fetchTransactions(codeInsee: string): Promise<DvfTransaction[]> {
    const fromCerema = await this.fetchFromCerema(codeInsee);
    if (fromCerema.length > 0) return fromCerema;
    return this.fetchFromCquest(codeInsee);
  }

  private async fetchFromCerema(codeInsee: string): Promise<DvfTransaction[]> {
    try {
      const url = `https://apidf-preprod.cerema.fr/dvf_opendata/mutations/?code_insee=${encodeURIComponent(codeInsee)}`;
      const res = await fetch(url, {
        headers: { Accept: 'application/json', 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; recherche comparables)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`DVF (Cerema) responded ${res.status} for commune ${codeInsee}`);
        return [];
      }
      const json = (await res.json()) as CeremaResponse | CeremaRecord[];
      const records = Array.isArray(json) ? json : (json.results ?? []);
      if (!Array.isArray(records) || records.length === 0) {
        this.logger.warn(`DVF (Cerema) returned no usable records for commune ${codeInsee}: ${JSON.stringify(json).slice(0, 500)}`);
        return [];
      }

      const transactions = records
        .map((r) => {
          const price = firstNumber(r, ['valeurfonc', 'valeur_fonciere', 'valeurfoncmut']);
          const surface = firstNumber(r, ['sbati', 'sbatp', 'surface_reelle_bati', 'surfbati']);
          const date = firstString(r, ['datemut', 'date_mutation']);
          const type = firstString(r, ['libtypbien', 'type_local', 'codtypbien']);
          return {
            date,
            address: firstString(r, ['l_adresse', 'adresse', 'libvoie']),
            type,
            surface,
            rooms: firstNumber(r, ['nbpiecmut', 'nombre_pieces_principales']),
            price,
            pricePerSqm: price !== null && surface !== null && surface > 0 ? Math.round(price / surface) : null,
          };
        })
        .filter((t) => t.date !== null);

      if (transactions.length === 0) {
        this.logger.warn(`DVF (Cerema) records didn't match any known field names for commune ${codeInsee}: ${JSON.stringify(records[0]).slice(0, 500)}`);
      }
      return transactions.sort((a, b) => (a.date! < b.date! ? 1 : -1));
    } catch (error) {
      this.logger.warn(`DVF (Cerema) fetch failed for commune ${codeInsee}: ${(error as Error).message}`);
      return [];
    }
  }

  /** Repli communautaire — voir l'avertissement de disponibilité en tête de fichier. */
  private async fetchFromCquest(codeInsee: string): Promise<DvfTransaction[]> {
    try {
      const url = `https://api.cquest.org/dvf?code_commune=${encodeURIComponent(codeInsee)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; recherche comparables)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`DVF (cquest, repli) responded ${res.status} for commune ${codeInsee}`);
        return [];
      }
      const json = (await res.json()) as DvfResponse;
      if (!Array.isArray(json.features)) {
        this.logger.warn(`DVF (cquest, repli) returned an unexpected shape for commune ${codeInsee}: ${JSON.stringify(json).slice(0, 300)}`);
        return [];
      }

      return json.features
        .map((f) => {
          const p = f.properties;
          const price = toNumber(p.valeur_fonciere);
          const surface = toNumber(p.surface_reelle_bati);
          return {
            date: (p.date_mutation as string) ?? null,
            address: [p.adresse_numero, p.adresse_nom_voie].filter(Boolean).join(' ') || null,
            type: (p.type_local as string) ?? null,
            surface,
            rooms: toNumber(p.nombre_pieces_principales),
            price,
            pricePerSqm: price !== null && surface !== null && surface > 0 ? Math.round(price / surface) : null,
          };
        })
        .filter((t) => t.date !== null)
        .sort((a, b) => (a.date! < b.date! ? 1 : -1));
    } catch (error) {
      this.logger.warn(`DVF (cquest, repli) fetch failed for commune ${codeInsee}: ${(error as Error).message}`);
      return [];
    }
  }
}

function firstNumber(record: CeremaRecord, keys: string[]): number | null {
  for (const key of keys) {
    const n = toNumber(record[key]);
    if (n !== null) return n;
  }
  return null;
}

function firstString(record: CeremaRecord, keys: string[]): string | null {
  for (const key of keys) {
    const v = record[key];
    if (typeof v === 'string' && v.length > 0) return v;
  }
  return null;
}

function toNumber(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const n = typeof v === 'string' ? parseFloat(v.replace(',', '.')) : Number(v);
  return Number.isFinite(n) ? n : null;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}
