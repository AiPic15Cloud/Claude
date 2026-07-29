import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';

interface CachedFx {
  value: number;
  changePct: number | null;
  fetchedAt: number;
}

interface CachedIndex {
  value: number;
  changePct: number | null;
  fetchedAt: number;
}

const FX_CACHE_TTL_MS = 5 * 60 * 1000;
const FX_URL = 'https://api.frankfurter.app/latest?from=EUR&to=USD';
const FX_YESTERDAY_URL = (date: string) => `https://api.frankfurter.app/${date}?from=EUR&to=USD`;

const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
// Twelve Data's exact symbol for the CAC 40 hasn't been verified against the
// live API from this environment (no outbound access) — tries a few plausible
// candidates and logs the raw response if every one of them fails, so a wrong
// first guess is fixable from production logs instead of a silent 502.
const CAC40_SYMBOL_CANDIDATES = ['CAC40', 'CAC', 'FCHI'];

/**
 * Live market/portfolio strip shown in the Topbar. EUR/USD comes from
 * Frankfurter (free, ECB reference rates, no key) — never fabricated.
 * The portfolio figures are our own real data, always available even if
 * the external FX call fails (graceful degradation, same pattern as
 * MeilisearchService).
 */
@Injectable()
export class MarketTickerService {
  private readonly logger = new Logger(MarketTickerService.name);
  private fxCache: CachedFx | null = null;
  private cac40Cache: CachedIndex | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  private async fetchFx(): Promise<CachedFx | null> {
    if (this.fxCache && Date.now() - this.fxCache.fetchedAt < FX_CACHE_TTL_MS) {
      return this.fxCache;
    }
    try {
      const res = await fetch(FX_URL, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { amount: number; date: string; rates: { USD: number } };
      const value = data.rates.USD;

      let changePct: number | null = null;
      try {
        const yesterday = new Date(Date.now() - 86_400_000).toISOString().slice(0, 10);
        const prevRes = await fetch(FX_YESTERDAY_URL(yesterday), { signal: AbortSignal.timeout(4000) });
        if (prevRes.ok) {
          const prevData = (await prevRes.json()) as { rates: { USD: number } };
          if (prevData.rates?.USD) {
            changePct = ((value - prevData.rates.USD) / prevData.rates.USD) * 100;
          }
        }
      } catch {
        // Change % is best-effort — an absolute rate with no delta is still useful.
      }

      this.fxCache = { value, changePct, fetchedAt: Date.now() };
      return this.fxCache;
    } catch (error) {
      this.logger.warn(`EUR/USD fetch failed: ${(error as Error).message}`);
      return this.fxCache; // serve last known value if we have one, else null
    }
  }

  private async fetchCac40(): Promise<CachedIndex | null> {
    if (this.cac40Cache && Date.now() - this.cac40Cache.fetchedAt < INDEX_CACHE_TTL_MS) {
      return this.cac40Cache;
    }
    const apiKey = this.config.get<string>('marketData.twelveDataApiKey');
    if (!apiKey) return null; // not configured — omitted, not an error

    for (const symbol of CAC40_SYMBOL_CANDIDATES) {
      try {
        const url = `https://api.twelvedata.com/quote?symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const data = (await res.json()) as { status?: string; message?: string; close?: string; percent_change?: string };
        if (!res.ok || data.status === 'error') {
          this.logger.warn(`Twelve Data CAC 40 symbol "${symbol}" failed: ${data.message ?? `HTTP ${res.status}`}`);
          continue;
        }
        const value = data.close !== undefined ? Number(data.close) : NaN;
        if (Number.isNaN(value)) {
          this.logger.warn(`Twelve Data CAC 40 symbol "${symbol}" returned an unexpected shape: ${JSON.stringify(data)}`);
          continue;
        }
        this.logger.log(`CAC 40 resolved with Twelve Data symbol "${symbol}"`);
        this.cac40Cache = {
          value,
          changePct: data.percent_change !== undefined ? Number(data.percent_change) : null,
          fetchedAt: Date.now(),
        };
        return this.cac40Cache;
      } catch (error) {
        this.logger.warn(`Twelve Data CAC 40 fetch failed for symbol "${symbol}": ${(error as Error).message}`);
      }
    }
    return this.cac40Cache; // serve last known value if we have one, else null
  }

  async summary(organizationId: string) {
    const [fx, cac40, aumAgg, activeCount] = await Promise.all([
      this.fetchFx(),
      this.fetchCac40(),
      this.prisma.deal.aggregate({
        where: { organizationId, status: 'ACTIVE' },
        _sum: { amountRaised: true },
      }),
      this.prisma.deal.count({ where: { organizationId, status: 'ACTIVE' } }),
    ]);

    return {
      eurUsd: fx ? { value: fx.value, changePct: fx.changePct, degraded: false } : { value: null, changePct: null, degraded: true },
      cac40: cac40
        ? { value: cac40.value, changePct: cac40.changePct, degraded: false }
        : { value: null, changePct: null, degraded: true },
      aum: { value: Number(aumAgg._sum.amountRaised ?? 0) },
      activeDeals: { value: activeCount },
      asOf: new Date().toISOString(),
    };
  }
}
