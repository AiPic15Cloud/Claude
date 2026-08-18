import * as XLSX from 'xlsx';

/** Génère un .xlsx côté client à partir de lignes déjà en mémoire — aucun aller-retour serveur nécessaire. */
export function exportToExcel(filename: string, sheetName: string, rows: Record<string, string | number | null>[]) {
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  XLSX.writeFile(workbook, filename);
}
