import type { RawObservationStatus, RawProjectObservation } from './project-observation.types';

/**
 * Extraction générique d'observations de projet depuis une page de listing
 * (spec ATLAS v2, C.3). Même réserve que market-price-extractor.util.ts
 * (C.8) : aucune des 5 pages pilotes n'a pu être observée depuis cet
 * environnement (accès direct bloqué par le proxy sortant, confirmé sur
 * plusieurs plateformes de crowdfunding immobilier). Un extracteur
 * "confiant" par site serait de l'invention — celui-ci reste générique
 * (JSON-LD standard SEO, puis technique RSC Next.js déjà éprouvée par
 * barometer.connector.ts) et ne retourne jamais une observation inventée :
 * si aucun tableau plausible n'est trouvé, retourne un tableau vide.
 */

const MIN_PLAUSIBLE_AMOUNT = 1_000;
const MAX_PLAUSIBLE_AMOUNT = 50_000_000;
const MIN_PLAUSIBLE_RATE = 0.5;
const MAX_PLAUSIBLE_RATE = 25;
const MIN_PLAUSIBLE_DURATION_MONTHS = 1;
const MAX_PLAUSIBLE_DURATION_MONTHS = 120;

function numberInRange(value: unknown, min: number, max: number): number | null {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value.replace(',', '.').replace(/[^\d.]/g, '')) : NaN;
  return Number.isFinite(n) && n >= min && n <= max ? n : null;
}

function stringField(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value.trim() : null;
}

function firstDefined(record: Record<string, unknown>, keys: string[]): unknown {
  for (const key of keys) {
    if (record[key] !== undefined && record[key] !== null) return record[key];
  }
  return undefined;
}

const STATUS_KEYWORDS: Record<RawObservationStatus, string[]> = {
  A_VENIR: ['a_venir', 'a venir', 'upcoming', 'bientot', 'bientôt', 'prochainement'],
  EN_COLLECTE: ['en_collecte', 'en collecte', 'ouvert', 'open', 'active', 'en cours', 'live', 'funding'],
  CLOTURE: ['cloture', 'clôturé', 'closed', 'termine', 'terminé', 'finance', 'financé', 'complete', 'complet'],
  RETIRE: ['retire', 'retiré', 'annule', 'annulé', 'removed', 'withdrawn'],
};

function normalizeStatus(raw: unknown): RawObservationStatus {
  const text = typeof raw === 'string' ? raw.toLowerCase() : '';
  for (const [status, keywords] of Object.entries(STATUS_KEYWORDS) as [RawObservationStatus, string[]][]) {
    if (keywords.some((k) => text.includes(k))) return status;
  }
  return 'EN_COLLECTE';
}

/** Devine les champs d'une observation à partir d'un objet de forme inconnue — plusieurs variantes de nom de clé, FR et EN. */
function mapCandidate(record: Record<string, unknown>): RawProjectObservation | null {
  const projectName = stringField(firstDefined(record, ['name', 'title', 'projectName', 'nom', 'titre']));
  const projectUrl = stringField(firstDefined(record, ['url', 'link', 'projectUrl', 'slug', 'href']));
  if (!projectName || !projectUrl) return null;

  return {
    projectName,
    projectUrl,
    operatorRaw: stringField(firstDefined(record, ['operator', 'promoter', 'porteur', 'promoteur', 'company', 'societe'])),
    amountTarget: numberInRange(firstDefined(record, ['amount', 'amountTarget', 'montant', 'targetAmount', 'goal']), MIN_PLAUSIBLE_AMOUNT, MAX_PLAUSIBLE_AMOUNT),
    ratePct: numberInRange(firstDefined(record, ['rate', 'ratePct', 'taux', 'interestRate', 'yield']), MIN_PLAUSIBLE_RATE, MAX_PLAUSIBLE_RATE),
    durationMonths: numberInRange(
      firstDefined(record, ['duration', 'durationMonths', 'duree', 'durée', 'term', 'termMonths']),
      MIN_PLAUSIBLE_DURATION_MONTHS,
      MAX_PLAUSIBLE_DURATION_MONTHS,
    ),
    sourceCategory: stringField(firstDefined(record, ['category', 'type', 'segment', 'categorie', 'catégorie'])),
    location: stringField(firstDefined(record, ['location', 'city', 'ville', 'localisation', 'lieu'])),
    status: normalizeStatus(firstDefined(record, ['status', 'statut', 'state'])),
  };
}

export function extractProjectObservations(html: string): RawProjectObservation[] {
  return extractFromJsonLd(html) ?? extractFromNextRscChunks(html) ?? [];
}

/** schema.org ItemList/Product — pratique SEO courante sur les pages de listing d'opportunités d'investissement. */
function extractFromJsonLd(html: string): RawProjectObservation[] | null {
  const blocks = html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi);
  for (const block of blocks) {
    try {
      const parsed: unknown = JSON.parse(block[1]);
      const items = findItemArray(parsed);
      if (items) {
        const mapped = items.map((item) => (item && typeof item === 'object' ? mapCandidate(item as Record<string, unknown>) : null)).filter((v): v is RawProjectObservation => v !== null);
        if (mapped.length > 0) return mapped;
      }
    } catch {
      // Bloc malformé ou inattendu — on continue avec les suivants.
    }
  }
  return null;
}

function findItemArray(node: unknown, depth = 0): unknown[] | null {
  if (depth > 5 || node === null || typeof node !== 'object') return null;
  if (Array.isArray(node)) return node.length > 0 ? node : null;

  const record = node as Record<string, unknown>;
  if (Array.isArray(record.itemListElement)) return record.itemListElement;

  for (const value of Object.values(record)) {
    if (value && typeof value === 'object') {
      const found = findItemArray(value, depth + 1);
      if (found) return found;
    }
  }
  return null;
}

const NEXT_RSC_MARKERS = ['"projects":[', '"campaigns":[', '"opportunities":[', '"listings":['];

/**
 * Technique déjà éprouvée par barometer.connector.ts pour
 * barometre-crowdfunding.com — de nombreux sites de crowdfunding modernes
 * partagent une stack Next.js similaire. Généralisée ici à plusieurs noms
 * de clé candidats plutôt que le seul "platforms" spécifique au baromètre.
 */
function extractFromNextRscChunks(html: string): RawProjectObservation[] | null {
  const chunkRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
  let combined = '';
  let match: RegExpExecArray | null;
  while ((match = chunkRegex.exec(html))) {
    try {
      combined += JSON.parse(`"${match[1]}"`);
    } catch {
      // Chunk malformé — on continue.
    }
  }
  if (!combined) return null;

  for (const marker of NEXT_RSC_MARKERS) {
    const markerIndex = combined.indexOf(marker);
    if (markerIndex === -1) continue;
    const arrayStart = markerIndex + marker.length - 1;
    const arrayEnd = findMatchingBracket(combined, arrayStart);
    if (arrayEnd === -1) continue;
    try {
      const items = JSON.parse(combined.slice(arrayStart, arrayEnd + 1));
      if (Array.isArray(items) && items.length > 0) {
        const mapped = items.map((item) => (item && typeof item === 'object' ? mapCandidate(item as Record<string, unknown>) : null)).filter((v): v is RawProjectObservation => v !== null);
        if (mapped.length > 0) return mapped;
      }
    } catch {
      // Continue avec le marqueur suivant.
    }
  }
  return null;
}

function findMatchingBracket(text: string, start: number): number {
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === '\\') {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}
