/**
 * Échappement HTML pour toute donnée dynamique interpolée dans un template
 * — sans ça, un nom de porteur, une note d'urbanisme ou un commentaire
 * saisi par un utilisateur pourrait injecter du HTML/JS dans le PDF généré
 * côté serveur (l'équivalent d'une XSS stockée, ici dans le rendu PDF).
 * Jamais de dangerouslySetInnerHTML-like ici : tout texte passe par escapeHtml.
 */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** `—` pour toute valeur absente — jamais une valeur recalculée pour combler un vide (doctrine "Unknown ≠ Zero"). */
export function text(value: string | null | undefined): string {
  return value && value.trim() ? escapeHtml(value) : '—';
}

/** Même format que `formatCurrency` côté frontend (apps/web/src/lib/format.ts) — partagé par tous les exports PDF serveur. */
export function money(value: unknown): string {
  if (value === null || value === undefined) return '—';
  const amount = Number(value);
  if (Number.isNaN(amount)) return '—';
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
    maximumFractionDigits: amount >= 100_000 ? 0 : 2,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount);
}

/** Même format que le `pct()` local de chaque print sheet côté frontend — partagé ici. */
export function pct(value: unknown, digits = 1): string {
  if (value === null || value === undefined) return '—';
  const n = Number(value);
  return Number.isNaN(n) ? '—' : `${n.toFixed(digits)} %`;
}

/** Même format que `formatDate` côté frontend (jour/mois abrégé/année). */
export function formatDate(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}

/** Style partagé par tous les exports PDF générés côté serveur — même esthétique (noir sur blanc, A4) que les anciens exports `window.print()` côté client. */
export const PRINT_BASE_STYLE = `
  * { box-sizing: border-box; }
  body { margin: 0; padding: 24px; background: #fff; color: #000; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif; font-size: 13px; line-height: 1.5; }
  h1 { font-size: 22px; font-weight: 600; margin: 0 0 4px; }
  h2 { font-size: 13px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(0,0,0,0.7); margin: 0 0 6px; }
  h3 { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(0,0,0,0.6); margin: 10px 0 4px; }
  p { margin: 0 0 4px; }
  ul { margin: 4px 0; padding-left: 20px; }
  li { margin-bottom: 2px; }
  a { color: #000; }
  header.doc-header { border-bottom: 1px solid #000; padding-bottom: 8px; margin-bottom: 16px; }
  .doc-meta { font-size: 11px; text-transform: uppercase; letter-spacing: 0.04em; color: rgba(0,0,0,0.6); margin: 0 0 2px; }
  section { margin-bottom: 16px; page-break-inside: avoid; }
  .grid { display: grid; gap: 8px; }
  .grid-3 { grid-template-columns: repeat(3, 1fr); }
  .grid-2 { grid-template-columns: repeat(2, 1fr); }
  .muted { color: rgba(0,0,0,0.6); }
  .small { font-size: 11px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { text-align: left; padding: 3px 6px 3px 0; }
  th { border-bottom: 1px solid #000; font-weight: 600; }
  td { border-bottom: 1px solid rgba(0,0,0,0.1); }
  .num { text-align: right; }
  footer.doc-footer { border-top: 1px solid #000; padding-top: 8px; margin-top: 24px; font-size: 10px; color: rgba(0,0,0,0.5); }
`;

/** Enveloppe HTML complète d'un document imprimable — un seul point d'entrée pour tous les exports PDF côté serveur. */
export function wrapPrintDocument(title: string, bodyHtml: string): string {
  return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(title)}</title>
<style>${PRINT_BASE_STYLE}</style>
</head>
<body>
${bodyHtml}
</body>
</html>`;
}
