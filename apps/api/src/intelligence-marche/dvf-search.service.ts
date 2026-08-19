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
 *
 * 1. api-adresse.data.gouv.fr (Base Adresse Nationale, service officiel de
 *    l'État) — résout une ville/adresse saisie en texte libre vers un code
 *    INSEE commune. Confirmé fonctionnel en production.
 * 2. Trois sources DVF essayées dans l'ordre, la première qui répond avec des
 *    transactions gagne :
 *    a. files.data.gouv.fr/geo-dvf (Etalab/DGFiP, fichiers CSV officiels non
 *       compressés, un par commune et par année — pas une API interrogeable
 *       mais des exports statiques republiés régulièrement, source la plus
 *       fiable car sans dépendance à une API tierce qui peut tomber). Essayée
 *       en premier. URL confirmée par recherche (ex. .../2025/communes/56/56001.csv) —
 *       une première version avait à tort supposé un .csv.gz.
 *    b. apidf-preprod.cerema.fr/dvf_opendata (API du Cerema) — répond bien
 *       (JSON DRF paginé valide) mais renvoie count:0 pour Lyon en test réel :
 *       son environnement "preprod" semble sans données exploitables plutôt
 *       qu'un vrai problème de nom de champ. Gardée en repli au cas où
 *       d'autres communes y sont peuplées.
 *    c. api.cquest.org/dvf (API communautaire) — son propre auteur la décrit
 *       comme un "proof of concept" sans garantie de disponibilité ; confirmé
 *       en pratique (502 observé en production).
 *
 * Aucune des trois formes exactes de réponse n'a pu être vérifiée en direct
 * depuis ce sandbox (accès réseau sortant bloqué, y compris pour les tests
 * curl manuels) — la structure de colonnes geo-dvf vient de sa documentation
 * publique connue (id_mutation, date_mutation, valeur_fonciere,
 * surface_reelle_bati, type_local, adresse_numero, adresse_nom_voie,
 * nombre_pieces_principales...), lue par nom de colonne (pas par position)
 * pour rester robuste à un réordonnancement, avec dump de l'en-tête réel en
 * log si aucune colonne connue n'est trouvée. Dégradation isolée comme tous
 * les autres connecteurs du module : un échec renvoie une liste vide, jamais
 * une erreur qui casse la page.
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
    const fromGeoDvf = await this.fetchFromGeoDvf(codeInsee);
    if (fromGeoDvf.length > 0) return fromGeoDvf;
    const fromCerema = await this.fetchFromCerema(codeInsee);
    if (fromCerema.length > 0) return fromCerema;
    return this.fetchFromCquest(codeInsee);
  }

  /** Fichiers CSV.gz officiels Etalab/DGFiP — un par commune et par année, pas d'API à interroger. */
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

        if (iValeur === -1 || iSurface === -1 || iDate === -1) {
          this.logger.warn(`geo-dvf CSV for commune ${codeInsee} has unexpected headers: ${lines[0].slice(0, 300)}`);
          continue;
        }

        const transactions = lines
          .slice(1)
          .map((line) => {
            const cols = parseCsvLine(line);
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
