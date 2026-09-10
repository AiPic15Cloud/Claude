import { Logger } from '@nestjs/common';

/**
 * SIREN resolution against public open data — extracted from
 * CompanyMonitoringService (deal-scoped surveillance) so the Entity
 * Resolution Engine (Market Relationship & Contagion Intelligence V2, §7.1)
 * can reuse the exact same, already-verified-in-production logic instead of
 * re-implementing it against these two APIs.
 *
 * Both sources confirmed in production on real SIREN (see
 * CompanyMonitoringService's class comment for the case history) —
 * unchanged here, only lifted out to standalone functions.
 */

const logger = new Logger('SirenResolver');

export interface CompanySearchResult {
  siren: string;
  name: string;
  city?: string;
  etatAdministratif?: string;
}

interface SearchResult {
  siren?: string;
  nom_complet?: string;
  etat_administratif?: string;
  siege?: { libelle_commune?: string };
}

interface SearchResponse {
  results?: SearchResult[];
}

/** `etat_administratif !== 'A'` reliably means closed/radiée — confirmed in production, this API has no `procedure_collective` field. */
export async function fetchSirenAdminStatus(siren: string): Promise<'actif' | 'fermee' | null> {
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&per_page=1`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const preview = await res.text().catch(() => '');
      logger.warn(`Recherche d'entreprises responded ${res.status} for SIREN ${siren}: ${preview.slice(0, 300)}`);
      return null;
    }
    const json = (await res.json()) as SearchResponse;
    const result = json.results?.find((r) => r.siren === siren) ?? json.results?.[0];
    if (!result) {
      logger.warn(`Recherche d'entreprises returned no result for SIREN ${siren}: ${JSON.stringify(json).slice(0, 300)}`);
      return null;
    }

    if (result.etat_administratif !== undefined && result.etat_administratif !== 'A') return 'fermee';
    if (result.etat_administratif === undefined) {
      logger.warn(`Recherche d'entreprises result for SIREN ${siren} has unexpected shape: ${JSON.stringify(result).slice(0, 300)}`);
      return null;
    }
    return 'actif';
  } catch (error) {
    logger.warn(`Recherche d'entreprises fetch failed for SIREN ${siren}: ${(error as Error).message}`);
    return null;
  }
}

/**
 * Name-based search (spec §7.1: "Si le SIREN est absent : rechercher
 * l'entité par dénomination + localisation") — same API, free-text query.
 * Returns candidates only; Entity Resolution decides whether a match is
 * confident enough, never auto-merges here.
 */
export async function searchCompanyByName(name: string, city?: string): Promise<CompanySearchResult[]> {
  try {
    const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(name)}&per_page=5`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const preview = await res.text().catch(() => '');
      logger.warn(`Recherche d'entreprises (nom) responded ${res.status} for "${name}": ${preview.slice(0, 300)}`);
      return [];
    }
    const json = (await res.json()) as SearchResponse;
    if (!Array.isArray(json.results)) return [];

    const normalizedCity = city?.trim().toLowerCase();
    return json.results
      .filter((r) => r.siren && r.nom_complet)
      .filter((r) => !normalizedCity || r.siege?.libelle_commune?.trim().toLowerCase() === normalizedCity)
      .map((r) => ({
        siren: r.siren!,
        name: r.nom_complet!,
        city: r.siege?.libelle_commune,
        etatAdministratif: r.etat_administratif,
      }));
  } catch (error) {
    logger.warn(`Recherche d'entreprises (nom) fetch failed for "${name}": ${(error as Error).message}`);
    return [];
  }
}

export interface ProcedureCollectiveResult {
  hasProcedureCollective: boolean;
  /** Raw BODACC avis-type labels found, for classifying LegalEvent.type — never guessed when empty. */
  labels: string[];
}

/** BODACC — `familleavis === "collective"` confirmed by log on real production data (see CompanyMonitoringService). */
export async function fetchSirenProcedureCollective(siren: string): Promise<ProcedureCollectiveResult> {
  try {
    const url = `https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales&q=registre:${encodeURIComponent(siren)}&rows=20`;
    const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
    if (!res.ok) {
      const preview = await res.text().catch(() => '');
      logger.warn(`BODACC responded ${res.status} for SIREN ${siren}: ${preview.slice(0, 300)}`);
      return { hasProcedureCollective: false, labels: [] };
    }
    const json = (await res.json()) as {
      records?: { fields?: { familleavis?: string; typeavis_lib?: string } }[];
    };
    if (!Array.isArray(json.records)) {
      logger.warn(`BODACC unexpected shape for SIREN ${siren}: ${JSON.stringify(json).slice(0, 300)}`);
      return { hasProcedureCollective: false, labels: [] };
    }
    const collectiveRecords = json.records.filter((r) => r.fields?.familleavis === 'collective');
    return {
      hasProcedureCollective: collectiveRecords.length > 0,
      labels: collectiveRecords.map((r) => r.fields?.typeavis_lib).filter((l): l is string => !!l),
    };
  } catch (error) {
    logger.warn(`BODACC fetch failed for SIREN ${siren}: ${(error as Error).message}`);
    return { hasProcedureCollective: false, labels: [] };
  }
}
