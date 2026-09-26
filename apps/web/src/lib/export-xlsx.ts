// Injection de formule XLSX/CSV (CWE-1236) : une chaîne commençant par
// =, +, -, @ ou une tabulation/retour chariot devient une formule exécutable
// dès que le fichier est ouvert dans Excel — un simple nom de dossier saisi
// par un utilisateur pourrait donc en embarquer une. On préfixe ces valeurs
// d'une apostrophe (force-texte Excel, invisible à l'affichage) plutôt que
// de laisser passer la chaîne brute.
const FORMULA_TRIGGER_CHARS = ['=', '+', '-', '@', '\t', '\r'];

function sanitizeCellValue(value: string | number | null): string | number | null {
  if (typeof value !== 'string' || value.length === 0) return value;
  return FORMULA_TRIGGER_CHARS.includes(value[0]) ? `'${value}` : value;
}

/**
 * Génère un .xlsx côté client à partir de lignes déjà en mémoire — aucun
 * aller-retour serveur nécessaire. exceljs est chargé dynamiquement (import()) :
 * la bibliothèque pèse plusieurs centaines de Ko, inutile de l'inclure dans le
 * bundle principal pour une action déclenchée seulement par 2 boutons d'export.
 */
export async function exportToExcel(filename: string, sheetName: string, rows: Record<string, string | number | null>[]) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet(sheetName);

  if (rows.length > 0) {
    sheet.columns = Object.keys(rows[0]).map((key) => ({ header: key, key }));
    sheet.addRows(rows.map((row) => Object.fromEntries(Object.entries(row).map(([key, value]) => [key, sanitizeCellValue(value)]))));
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
