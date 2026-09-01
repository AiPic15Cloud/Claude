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
    sheet.addRows(rows);
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
