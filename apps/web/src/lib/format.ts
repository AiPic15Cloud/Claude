export function formatCurrency(value: number | string, currency = 'EUR'): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  const absAmount = Math.abs(amount);
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: absAmount >= 100_000 ? 0 : 2,
    notation: absAmount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount);
}

// Contrairement à formatCurrency(), n'abrège jamais (pas de notation
// "compact" au-delà de 1M) — pour les cartes dont le but est de donner des
// montants exacts, arrondis à l'euro, plutôt qu'un résumé lisible.
export function formatCurrencyExact(value: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(value);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
