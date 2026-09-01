/** Télécharge un objet déjà en mémoire en .json côté client — même esprit que export-xlsx.ts, aucune dépendance externe. */
export function exportToJson(filename: string, data: unknown) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
