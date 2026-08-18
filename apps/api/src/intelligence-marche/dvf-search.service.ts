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
 *    INSEE commune.
 * 2. api.cquest.org/dvf — API communautaire (non officielle, meilleur effort)
 *    qui indexe le jeu de données officiel "Demandes de valeurs foncières"
 *    (data.gouv.fr) par commune. Pas de garantie de disponibilité contractuelle
 *    contrairement à un service d'État — dégradation isolée comme tous les
 *    autres connecteurs de ce module : un échec renvoie une liste vide, jamais
 *    une erreur qui casse la page, et le détail de la réponse est loggé pour
 *    diagnostic si la forme ne correspond pas à ce qui est attendu ici.
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
    try {
      const url = `https://api.cquest.org/dvf?code_commune=${encodeURIComponent(codeInsee)}`;
      const res = await fetch(url, {
        headers: { 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; recherche comparables)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) {
        this.logger.warn(`DVF (cquest) responded ${res.status} for commune ${codeInsee}`);
        return [];
      }
      const json = (await res.json()) as DvfResponse;
      if (!Array.isArray(json.features)) {
        this.logger.warn(`DVF (cquest) returned an unexpected shape for commune ${codeInsee}: ${JSON.stringify(json).slice(0, 300)}`);
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
      this.logger.warn(`DVF (cquest) fetch failed for commune ${codeInsee}: ${(error as Error).message}`);
      return [];
    }
  }
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
