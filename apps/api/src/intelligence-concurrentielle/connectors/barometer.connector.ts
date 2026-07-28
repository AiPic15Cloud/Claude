import { Injectable, Logger } from '@nestjs/common';

export interface CompetitorStats {
  name: string;
  category?: string;
  isTerminated?: boolean;
  totalFunded?: number;
  projectCountFinanced?: number;
  capitalReimbursed?: number;
  projectCountReimbursed?: number;
  riskAmount?: number;
  riskProjects?: number;
  capitalInDefault?: number;
  qualityScore?: number;
  lastReportDate?: string;
  averageLoanDuration?: number;
}

interface RawPlatform {
  name?: unknown;
  category?: unknown;
  isTerminated?: unknown;
  totalFunded?: unknown;
  projectCountFinanced?: unknown;
  capitalReimbursed?: unknown;
  projectCountReimbursed?: unknown;
  riskAmount?: unknown;
  riskProjects?: unknown;
  capitalInDefault?: unknown;
  quality?: { score?: unknown };
  lastReportDate?: unknown;
  averageLoanDuration?: unknown;
}

const SOURCE_URL = 'https://www.barometre-crowdfunding.com/platforms';

/**
 * https://www.barometre-crowdfunding.com/platforms is a Next.js app — the
 * comparison table isn't in the server HTML as a <table>, it's rendered
 * client-side from data the framework streams down as React Server
 * Component payload chunks: `self.__next_f.push([1, "<id>:<json>"])` script
 * tags. That payload — not the rendered DOM — is where the real platform
 * data lives, and it's present in the raw HTML response, so a plain fetch
 * (no headless browser needed) can reach it. Confirmed against a real
 * captured page: the `"platforms":[...]` array sits inside one of these
 * chunks with per-platform fields (totalFunded, riskAmount, quality.score,
 * etc.) far richer than anything a scraped <table> would have offered.
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
        signal: AbortSignal.timeout(15_000),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const html = await res.text();

      const platforms = this.extractPlatformsPayload(html);
      if (!platforms) {
        this.logger.warn('Barometer page fetched but no "platforms" payload found in its RSC script chunks — the page format may have changed.');
        return [];
      }

      const stats = platforms
        .filter((p): p is RawPlatform & { name: string } => Boolean(p) && typeof (p as RawPlatform).name === 'string')
        .map((p): CompetitorStats => ({
          name: p.name,
          category: typeof p.category === 'string' ? p.category : undefined,
          isTerminated: Boolean(p.isTerminated),
          totalFunded: numberOrUndefined(p.totalFunded),
          projectCountFinanced: numberOrUndefined(p.projectCountFinanced),
          capitalReimbursed: numberOrUndefined(p.capitalReimbursed),
          projectCountReimbursed: numberOrUndefined(p.projectCountReimbursed),
          riskAmount: numberOrUndefined(p.riskAmount),
          riskProjects: numberOrUndefined(p.riskProjects),
          capitalInDefault: numberOrUndefined(p.capitalInDefault),
          qualityScore: numberOrUndefined(p.quality?.score),
          lastReportDate: typeof p.lastReportDate === 'string' ? p.lastReportDate.replace(/^\$D/, '') : undefined,
          averageLoanDuration: numberOrUndefined(p.averageLoanDuration),
        }));

      this.logger.log(`Barometer RSC payload returned ${stats.length} platform(s).`);
      return stats;
    } catch (error) {
      this.logger.warn(`Barometer fetch failed: ${(error as Error).message}`);
      return [];
    }
  }

  /**
   * Next.js streams its React Server Component payload as a series of
   * `self.__next_f.push([1, "<chunkId>:<json-escaped-string>"])` script
   * tags. Each captured string is itself JSON-string-escaped (wrapping it
   * in quotes and JSON.parse-ing is the standard trick to unescape it), so
   * concatenating every chunk's unescaped content reconstructs one big
   * text blob containing the full payload — including, somewhere in it,
   * `"platforms":[...]`. Rather than fully parsing the RSC wire format,
   * this locates that marker and bracket-matches to the array's end.
   */
  private extractPlatformsPayload(html: string): RawPlatform[] | null {
    const chunkRegex = /self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g;
    let combined = '';
    let match: RegExpExecArray | null;
    while ((match = chunkRegex.exec(html))) {
      try {
        combined += JSON.parse(`"${match[1]}"`);
      } catch {
        // Malformed/unexpected chunk — skip it, keep scanning the rest.
      }
    }

    const marker = '"platforms":[';
    const markerIndex = combined.indexOf(marker);
    if (markerIndex === -1) return null;
    const arrayStart = markerIndex + marker.length - 1;

    let depth = 0;
    let inString = false;
    let escaped = false;
    let arrayEnd = -1;
    for (let i = arrayStart; i < combined.length; i++) {
      const ch = combined[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === '\\') {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === '[') depth++;
      else if (ch === ']') {
        depth--;
        if (depth === 0) {
          arrayEnd = i;
          break;
        }
      }
    }
    if (arrayEnd === -1) return null;

    try {
      return JSON.parse(combined.slice(arrayStart, arrayEnd + 1));
    } catch {
      return null;
    }
  }
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}
