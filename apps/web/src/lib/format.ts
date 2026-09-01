export function formatCurrency(value: number | string, currency = 'EUR'): string {
  const amount = typeof value === 'string' ? Number(value) : value;
  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    maximumFractionDigits: amount >= 100_000 ? 0 : 2,
    notation: amount >= 1_000_000 ? 'compact' : 'standard',
  }).format(amount);
}

export function formatCompactNumber(value: number): string {
  return new Intl.NumberFormat('fr-FR', { notation: 'compact', maximumFractionDigits: 1 }).format(value);
}

export function formatDate(value: string | Date, options?: Intl.DateTimeFormatOptions): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  return new Intl.DateTimeFormat('fr-FR', options ?? { day: '2-digit', month: 'short', year: 'numeric' }).format(date);
}
