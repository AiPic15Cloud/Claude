const EXCEL_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel',
]);

/** Formats the AI agents can read directly — mirrors buildDocumentContentBlock on the API side (PDF native, Excel via CSV conversion). */
export function isDocumentReadableByAgent(doc: { mimeType: string; name: string }): boolean {
  return doc.mimeType === 'application/pdf' || EXCEL_MIME_TYPES.has(doc.mimeType) || /\.(xlsx|xls)$/i.test(doc.name);
}
