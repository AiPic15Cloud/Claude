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
 *
 * 1. api-adresse.data.gouv.fr (Base Adresse Nationale, service officiel de
 *    l'État) — résout une ville/adresse saisie en texte libre vers un code
 *    INSEE commune. Confirmé fonctionnel en production.
 * 2. files.data.gouv.fr/geo-dvf (Etalab/DGFiP, fichiers CSV officiels non
 *    compressés, un par commune et par année) — confirmé fonctionnel en
 *    production (Rennes, Lyon 7e, Givors testés avec des résultats
 *    cohérents moyenne/médiane). Deux autres sources (API Cerema
 *    "preprod", API communautaire cquest.org) ont été essayées et
 *    retirées : toutes deux confirmées non fonctionnelles en pratique
 *    (Cerema renvoie count:0 même sur Lyon, cquest.org renvoie 502) — pas
 *    la peine de garder du code mort qui ne sert jamais de repli utile.
 *
 * Dégradation isolée comme tous les autres connecteurs du module : un échec
 * renvoie une liste vide, jamais une erreur qui casse la page.
 */
@Injectable()
export class DvfSearchService {
  private readonly logger = new Logger(DvfSearchService.name);

  async search(query: string): Promise<DvfSearchResult> {
    const commune = await this.resolveCommune(query);
    if (!commune) {
      return { query, commune: null, transactions: [], averagePricePerSqm: null, medianPricePerSqm: null, sampleSize: 0 };
    }

    const transactions = await this.fetchFromGeoDvf(commune.codeInsee);
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

  /** Fichiers CSV officiels Etalab/DGFiP — un par commune et par année, pas d'API à interroger. */
  private async fetchFromGeoDvf(codeInsee: string): Promise<DvfTransaction[]> {
    const department = codeInsee.startsWith('97') ? codeInsee.slice(0, 3) : codeInsee.slice(0, 2);
    const currentYear = new Date().getFullYear();

    for (const year of [currentYear, currentYear - 1, currentYear - 2, currentYear - 3]) {
      try {
        const url = `https://files.data.gouv.fr/geo-dvf/latest/csv/${year}/communes/${department}/${codeInsee}.csv`;
        const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
        if (!res.ok) {
          if (res.status !== 404) this.logger.warn(`geo-dvf responded ${res.status} for commune ${codeInsee}, year ${year}`);
          continue;
        }
        const csv = await res.text();
        const lines = csv.split('\n').filter((l) => l.trim().length > 0);
        if (lines.length < 2) continue;

        const headers = parseCsvLine(lines[0]);
        const col = (name: string) => headers.indexOf(name);
        const iValeur = col('valeur_fonciere');
        const iSurface = col('surface_reelle_bati');
        const iDate = col('date_mutation');
        const iType = col('type_local');
        const iNumero = col('adresse_numero');
        const iVoie = col('adresse_nom_voie');
        const iPieces = col('nombre_pieces_principales');
        const iIdMutation = col('id_mutation');
        const iNature = col('nature_mutation');

        if (iValeur === -1 || iSurface === -1 || iDate === -1) {
          this.logger.warn(`geo-dvf CSV for commune ${codeInsee} has unexpected headers: ${lines[0].slice(0, 300)}`);
          continue;
        }

        // Une mutation peut apparaître sur plusieurs lignes (maison + garage
        // sur des parcelles distinctes) en répétant le même valeur_fonciere
        // total — sans dédup, ces lignes gonflent artificiellement la moyenne.
        // On garde uniquement les ventes de logements (Maison/Appartement) et
        // une seule ligne par id_mutation.
        const seenMutations = new Set<string>();
        const transactions = lines
          .slice(1)
          .map((line) => parseCsvLine(line))
          .filter((cols) => (iNature === -1 ? true : cols[iNature] === 'Vente'))
          .filter((cols) => (iType === -1 ? true : cols[iType] === 'Maison' || cols[iType] === 'Appartement'))
          .filter((cols) => {
            if (iIdMutation === -1) return true;
            const id = cols[iIdMutation];
            if (!id || seenMutations.has(id)) return false;
            seenMutations.add(id);
            return true;
          })
          .map((cols) => {
            const price = toNumber(cols[iValeur]);
            const surface = toNumber(cols[iSurface]);
            return {
              date: cols[iDate] || null,
              address: [cols[iNumero], cols[iVoie]].filter(Boolean).join(' ') || null,
              type: iType !== -1 ? cols[iType] || null : null,
              surface,
              rooms: iPieces !== -1 ? toNumber(cols[iPieces]) : null,
              price,
              pricePerSqm: price !== null && surface !== null && surface > 0 ? Math.round(price / surface) : null,
            };
          })
          .filter((t) => t.date !== null);

        this.logger.log(`geo-dvf resolved ${transactions.length} transaction(s) for commune ${codeInsee}, year ${year}`);
        return transactions.sort((a, b) => (a.date! < b.date! ? 1 : -1));
      } catch (error) {
        this.logger.warn(`geo-dvf fetch failed for commune ${codeInsee}, year ${year}: ${(error as Error).message}`);
      }
    }
    return [];
  }
}

/** Simple RFC4180-ish CSV line splitter (comma-separated, double-quote escaping). */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"' && line[i + 1] === '"') {
        current += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        current += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }
  fields.push(current.trim());
  return fields;
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
