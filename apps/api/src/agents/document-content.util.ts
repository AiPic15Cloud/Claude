import * as XLSX from 'xlsx';
import type Anthropic from '@anthropic-ai/sdk';

const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

// Keeps a huge workbook from blowing the request's context — a BP spreadsheet
// rarely needs more than this to expose its financial figures to the model.
const MAX_EXCEL_CHARS = 60_000;

export type DocumentContentResult =
  | { ok: true; block: Anthropic.Messages.ContentBlockParam }
  | { ok: false; error: string };

/**
 * Builds the Claude content block for a stored document. PDFs are handed to
 * Claude natively (base64 document block — no server-side text extraction,
 * so scanned/image-only PDFs still work). Excel workbooks have no native
 * Claude support, so each sheet is flattened to CSV and sent as plain text.
 */
export function buildDocumentContentBlock(buffer: Buffer, mimeType: string, filename: string): DocumentContentResult {
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
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: 'buffer' });
    } catch {
      return { ok: false, error: `Le fichier « ${filename} » n'a pas pu être lu comme un classeur Excel.` };
    }

    const sheets = workbook.SheetNames.map((name) => {
      const csv = XLSX.utils.sheet_to_csv(workbook.Sheets[name]);
      return `--- Feuille « ${name} » ---\n${csv}`;
    }).join('\n\n');

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
