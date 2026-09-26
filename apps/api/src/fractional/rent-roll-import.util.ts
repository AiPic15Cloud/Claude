import { FractionalIndexationType, FractionalLeaseRenewalStatus } from '@prisma/client';

/**
 * Colonnes attendues dans le CSV de rent roll, dans l'ordre du gabarit
 * exposé à l'utilisateur (spec Cockpit/Fractionné P2 §7 — import
 * documentaire). Seules tenantName/dateEffet/dateTerme/loyerFacialAnnuel
 * sont obligatoires ; le reste reprend les champs optionnels de
 * CreateLeaseDto déjà utilisés pour la saisie manuelle d'un bail.
 */
export const RENT_ROLL_REQUIRED_COLUMNS = ['tenantName', 'dateEffet', 'dateTerme', 'loyerFacialAnnuel'] as const;
export const RENT_ROLL_COLUMNS = [
  'tenantName',
  'lotLabel',
  'surfaceM2',
  'dateEffet',
  'dateTerme',
  'loyerFacialAnnuel',
  'indexation',
  'franchiseMois',
  'depotGarantieMontant',
  'statutRenouvellement',
  'impayesNotes',
] as const;

export interface RentRollImportRow {
  tenantName: string;
  lotLabel?: string;
  surfaceM2?: number;
  dateEffet: string;
  dateTerme: string;
  loyerFacialAnnuel: number;
  indexation?: FractionalIndexationType;
  franchiseMois?: number;
  depotGarantieMontant?: number;
  statutRenouvellement?: FractionalLeaseRenewalStatus;
  impayesNotes?: string;
}

export interface RentRollRowError {
  row: number;
  message: string;
}

export interface RentRollParseResult {
  rows: { row: number; data: RentRollImportRow }[];
  errors: RentRollRowError[];
}

/** Détecte le séparateur en comparant les occurrences sur la ligne d'en-têtes (virgule ou point-virgule, export Excel FR courant). */
function detectDelimiter(headerLine: string): ',' | ';' {
  const semicolons = (headerLine.match(/;/g) ?? []).length;
  const commas = (headerLine.match(/,/g) ?? []).length;
  return semicolons > commas ? ';' : ',';
}

/** Parseur CSV minimal (RFC4180 : champs entre guillemets, guillemets doublés, retours ligne CRLF/LF). */
export function parseCsvLines(text: string, delimiter: ',' | ';'): string[][] {
  const rows: string[][] = [];
  let field = '';
  let row: string[] = [];
  let inQuotes = false;
  const pushField = () => {
    row.push(field);
    field = '';
  };
  const pushRow = () => {
    pushField();
    rows.push(row);
    row = [];
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQuotes) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
      continue;
    }
    if (c === '"') {
      inQuotes = true;
    } else if (c === delimiter) {
      pushField();
    } else if (c === '\n') {
      pushRow();
    } else if (c === '\r') {
      // skip — pushRow happens on the following \n
    } else {
      field += c;
    }
  }
  if (field.length > 0 || row.length > 0) pushRow();

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''));
}

function parseOptionalNumber(raw: string): number | undefined | null {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const normalized = trimmed.replace(/\s/g, '').replace(',', '.');
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

function parseOptionalDate(raw: string): string | undefined | null {
  const trimmed = raw.trim();
  if (trimmed === '') return undefined;
  const isoMatch = /^\d{4}-\d{2}-\d{2}/.test(trimmed);
  const frMatch = trimmed.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  const candidate = isoMatch ? trimmed : frMatch ? `${frMatch[3]}-${frMatch[2]}-${frMatch[1]}` : trimmed;
  const date = new Date(candidate);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

/**
 * Parse un CSV de rent roll en lignes exploitables + erreurs par ligne
 * (jamais tout-ou-rien : une ligne invalide n'empêche pas les autres
 * d'être importées, cf. le rapport ligne par ligne exigé par la spec).
 */
export function parseRentRollCsv(csvText: string): RentRollParseResult {
  const trimmed = csvText.charCodeAt(0) === 0xfeff ? csvText.slice(1) : csvText;
  const firstLine = trimmed.split(/\r?\n/, 1)[0] ?? '';
  const delimiter = detectDelimiter(firstLine);
  const lines = parseCsvLines(trimmed, delimiter);

  if (lines.length === 0) {
    return { rows: [], errors: [{ row: 0, message: 'Fichier CSV vide' }] };
  }

  const headers = lines[0].map((h) => h.trim());
  const missing = RENT_ROLL_REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
  if (missing.length > 0) {
    return { rows: [], errors: [{ row: 0, message: `Colonnes obligatoires manquantes : ${missing.join(', ')}` }] };
  }

  const rows: { row: number; data: RentRollImportRow }[] = [];
  const errors: RentRollRowError[] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-based, en-tête = ligne 1
    const values = lines[i];
    if (values.every((v) => v.trim() === '')) continue;

    const get = (col: string) => {
      const idx = headers.indexOf(col);
      return idx === -1 ? '' : (values[idx] ?? '');
    };

    const tenantName = get('tenantName').trim();
    if (!tenantName) {
      errors.push({ row: rowNumber, message: 'tenantName manquant' });
      continue;
    }

    const dateEffet = parseOptionalDate(get('dateEffet'));
    if (!dateEffet) {
      errors.push({ row: rowNumber, message: `dateEffet invalide : "${get('dateEffet')}"` });
      continue;
    }
    const dateTerme = parseOptionalDate(get('dateTerme'));
    if (!dateTerme) {
      errors.push({ row: rowNumber, message: `dateTerme invalide : "${get('dateTerme')}"` });
      continue;
    }

    const loyerFacialAnnuel = parseOptionalNumber(get('loyerFacialAnnuel'));
    if (loyerFacialAnnuel === undefined || loyerFacialAnnuel === null) {
      errors.push({ row: rowNumber, message: `loyerFacialAnnuel invalide : "${get('loyerFacialAnnuel')}"` });
      continue;
    }

    const surfaceM2 = parseOptionalNumber(get('surfaceM2'));
    if (surfaceM2 === null) {
      errors.push({ row: rowNumber, message: `surfaceM2 invalide : "${get('surfaceM2')}"` });
      continue;
    }
    const franchiseMois = parseOptionalNumber(get('franchiseMois'));
    if (franchiseMois === null) {
      errors.push({ row: rowNumber, message: `franchiseMois invalide : "${get('franchiseMois')}"` });
      continue;
    }
    const depotGarantieMontant = parseOptionalNumber(get('depotGarantieMontant'));
    if (depotGarantieMontant === null) {
      errors.push({ row: rowNumber, message: `depotGarantieMontant invalide : "${get('depotGarantieMontant')}"` });
      continue;
    }

    const indexationRaw = get('indexation').trim().toUpperCase();
    const indexation = indexationRaw === '' ? undefined : (indexationRaw as FractionalIndexationType);
    if (indexation !== undefined && !Object.values(FractionalIndexationType).includes(indexation)) {
      errors.push({ row: rowNumber, message: `indexation inconnue : "${get('indexation')}" (attendu : ${Object.values(FractionalIndexationType).join('/')})` });
      continue;
    }

    const statutRaw = get('statutRenouvellement').trim().toUpperCase();
    const statutRenouvellement = statutRaw === '' ? undefined : (statutRaw as FractionalLeaseRenewalStatus);
    if (statutRenouvellement !== undefined && !Object.values(FractionalLeaseRenewalStatus).includes(statutRenouvellement)) {
      errors.push({
        row: rowNumber,
        message: `statutRenouvellement inconnu : "${get('statutRenouvellement')}" (attendu : ${Object.values(FractionalLeaseRenewalStatus).join('/')})`,
      });
      continue;
    }

    rows.push({
      row: rowNumber,
      data: {
        tenantName,
        lotLabel: get('lotLabel').trim() || undefined,
        surfaceM2: surfaceM2 ?? undefined,
        dateEffet,
        dateTerme,
        loyerFacialAnnuel,
        indexation,
        franchiseMois: franchiseMois ?? undefined,
        depotGarantieMontant: depotGarantieMontant ?? undefined,
        statutRenouvellement,
        impayesNotes: get('impayesNotes').trim() || undefined,
      },
    });
  }

  return { rows, errors };
}
