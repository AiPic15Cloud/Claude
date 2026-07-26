import type { CompetitorStats } from './connectors/barometer.connector';

/**
 * Indicative platform score (0-100), the competitor-facing counterpart of
 * the per-deal Score ATLAS — same spirit (transparent, rule-based, not a
 * financial rating), applied to whatever the barometer actually reports.
 * Missing fields simply don't contribute (neutral), so a partially-scraped
 * platform still gets a defensible score instead of a fabricated one.
 */
export function computePlatformScore(stats: CompetitorStats): number | null {
  const parts: number[] = [];

  if (stats.lateRate !== undefined) {
    parts.push(Math.max(0, 100 - stats.lateRate * 4));
  }
  if (stats.averageInterestRate !== undefined) {
    // Very low rates can mean under-priced risk; very high can mean distressed
    // borrowers. 8-11% is treated as the well-priced band for this asset class.
    const distanceFromBand = Math.max(0, stats.averageInterestRate < 8 ? 8 - stats.averageInterestRate : stats.averageInterestRate - 11);
    parts.push(Math.max(0, 100 - distanceFromBand * 8));
  }
  if (stats.cumulativeProjectsCount !== undefined) {
    parts.push(Math.min(100, 40 + stats.cumulativeProjectsCount / 5));
  }

  if (parts.length === 0) return null;
  return Math.round(parts.reduce((sum, p) => sum + p, 0) / parts.length);
}
