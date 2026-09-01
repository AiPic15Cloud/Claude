import ExcelJS from 'exceljs';
import type Anthropic from '@anthropic-ai/sdk';

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

// Keeps a huge workbook from blowing the request's context — a BP spreadsheet
// rarely needs more than this to expose its financial figures to the model.
const MAX_EXCEL_CHARS = 60_000;

// Signature OLE2 (Excel 97-2003, .xls binaire) — exceljs ne lit que l'OOXML
// (.xlsx/.xlsm, signature ZIP "PK"). La bibliothèque précédente (xlsx/SheetJS)
// lisait aussi ce format, mais porte des CVE de pollution de prototype et de
// ReDoS sans correctif publié sur npm — jamais acceptable ici puisque ce code
// lit des fichiers uploadés par l'utilisateur, donc potentiellement hostiles.
const OLE2_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return '';
  const text = typeof value === 'object' && value !== null && 'text' in value ? String((value as { text: unknown }).text) : String(value);
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export type DocumentContentResult =
  | { ok: true; block: Anthropic.Messages.ContentBlockParam }
  | { ok: false; error: string };

/**
 * Builds the Claude content block for a stored document. PDFs are handed to
 * Claude natively (base64 document block — no server-side text extraction,
 * so scanned/image-only PDFs still work). Excel workbooks have no native
 * Claude support, so each sheet is flattened to CSV and sent as plain text.
 */
export async function buildDocumentContentBlock(buffer: Buffer, mimeType: string, filename: string): Promise<DocumentContentResult> {
  if (mimeType === 'application/pdf') {
    return {
      ok: true,
      block: {
        type: 'document',
        title: filename,
        source: { type: 'base64', media_type: 'application/pdf', data: buffer.toString('base64') },
      },
    };
  }

  if (EXCEL_MIME_TYPES.has(mimeType) || /\.(xlsx|xls)$/i.test(filename)) {
    if (buffer.subarray(0, 8).equals(OLE2_SIGNATURE)) {
      return { ok: false, error: `Le fichier « ${filename} » est au format Excel 97-2003 (.xls) — enregistrez-le en .xlsx puis réessayez.` };
    }

    const workbook = new ExcelJS.Workbook();
    try {
      await workbook.xlsx.load(buffer as unknown as ArrayBuffer);
    } catch {
      return { ok: false, error: `Le fichier « ${filename} » n'a pas pu être lu comme un classeur Excel.` };
    }

    const sheets = workbook.worksheets
      .map((sheet) => {
        const rows: string[] = [];
        sheet.eachRow({ includeEmpty: false }, (row) => {
          const values = (row.values as unknown[]).slice(1); // row.values[0] est toujours vide (index 1-based côté exceljs)
          rows.push(values.map(csvEscape).join(','));
        });
        return `--- Feuille « ${sheet.name} » ---\n${rows.join('\n')}`;
      })
      .join('\n\n');

    const truncated = sheets.length > MAX_EXCEL_CHARS;
    const text = truncated ? `${sheets.slice(0, MAX_EXCEL_CHARS)}\n\n[... contenu tronqué ...]` : sheets;

    return {
      ok: true,
      block: {
        type: 'text',
        text: `Contenu du fichier Excel « ${filename} » (converti en CSV par feuille) :\n\n${text}`,
      },
    };
  }

  return {
    ok: false,
    error: `Format non supporté pour l'analyse automatique (« ${mimeType || filename} »). Seuls le PDF et Excel (.xlsx/.xls) sont pris en charge.`,
  };
}
