import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';

export interface CompetitorStats {
  name: string;
  website?: string;
  activeProjectsCount?: number;
  cumulativeCollectedAmount?: number;
  currentYearCollectedAmount?: number;
  cumulativeProjectsCount?: number;
  currentYearProjectsCount?: number;
  lateRate?: number;
  averageInterestRate?: number;
}

const SOURCE_URL = 'https://www.barometre-crowdfunding.com/platforms';

// Maps a lowercased, accent-stripped header fragment to the stat it feeds.
const HEADER_HINTS: { hint: string; field: keyof CompetitorStats }[] = [
  { hint: 'projet', field: 'activeProjectsCount' },
  { hint: 'collecte cumul', field: 'cumulativeCollectedAmount' },
  { hint: 'collecte', field: 'currentYearCollectedAmount' },
  { hint: 'nombre de projets cumul', field: 'cumulativeProjectsCount' },
  { hint: 'nombre de projets', field: 'currentYearProjectsCount' },
  { hint: 'retard', field: 'lateRate' },
  { hint: 'taux', field: 'averageInterestRate' },
];

function stripAccents(s: string): string {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function parseNumber(raw: string): number | undefined {
  const cleaned = raw.replace(/[^\d,.-]/g, '').replace(',', '.');
  if (!cleaned) return undefined;
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Best-effort scraper for https://www.barometre-crowdfunding.com/platforms —
 * a public, general-interest crowdfunding barometer (not a proprietary
 * competitor's private dashboard). The exact table structure couldn't be
 * inspected ahead of time (the request is blocked from the dev sandbox's
 * network), so this parses defensively by header keyword rather than fixed
 * column indices, and returns an empty list — never fabricated numbers —
 * if it can't find a recognizable table.
 */
@Injectable()
export class BarometerConnector {
  private readonly logger = new Logger(BarometerConnector.name);

  async fetchCompetitorStats(): Promise<CompetitorStats[]> {
    try {
      const res = await fetch(SOURCE_URL, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml',
        },
        signal: AbortSignal.timeout(10_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();
      const stats = this.parseTable(html);
      if (stats.length === 0) {
        this.logger.warn('Barometer page fetched but no recognizable platform table found — check the selectors.');
      }
      return stats;
    } catch (error) {
      this.logger.warn(`Barometer fetch failed: ${(error as Error).message}`);
      return [];
    }
  }

  private parseTable(html: string): CompetitorStats[] {
    const $ = cheerio.load(html);
    const tables = $('table').toArray();
    for (const table of tables) {
      const $table = $(table);
      const headers = $table
        .find('thead th, tr:first-child th, tr:first-child td')
        .toArray()
        .map((el) => stripAccents($(el).text().trim().toLowerCase()));
      if (headers.length < 2) continue;

      const nameColIndex = 0;
      const fieldByCol: (keyof CompetitorStats | undefined)[] = headers.map((h) => {
        const match = HEADER_HINTS.find((hh) => h.includes(hh.hint));
        return match?.field;
      });
      if (!fieldByCol.some(Boolean)) continue;

      const rows = $table.find('tbody tr').toArray();
      const results: CompetitorStats[] = [];
      for (const row of rows) {
        const cells = $(row).find('td').toArray().map((el) => $(el).text().trim());
        if (cells.length < 2) continue;
        const name = cells[nameColIndex];
        if (!name) continue;

        const stat: CompetitorStats = { name };
        cells.forEach((cellText, i) => {
          const field = fieldByCol[i];
          if (!field || field === 'name') return;
          const n = parseNumber(cellText);
          if (n !== undefined) (stat as unknown as Record<string, unknown>)[field] = n;
        });
        const link = $(row).find('a[href^="http"]').attr('href');
        if (link) stat.website = link;
        results.push(stat);
      }
      if (results.length > 0) return results;
    }
    return [];
  }
}
