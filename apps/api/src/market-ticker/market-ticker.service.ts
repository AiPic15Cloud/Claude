import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../common/prisma/prisma.service';
import { MarketIndicatorsService } from '../intelligence-marche/indicators.service';

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

const BTC_CACHE_TTL_MS = 5 * 60 * 1000;
const BTC_URL = 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=eur&include_24hr_change=true';

const INDEX_CACHE_TTL_MS = 5 * 60 * 1000;
// Twelve Data's exact symbol for the CAC 40 hasn't been verified against the
// live API from this environment (no outbound access) — tries a few plausible
// candidates and logs the raw response if every one of them fails, so a wrong
// first guess is fixable from production logs instead of a silent 502.
const CAC40_SYMBOL_CANDIDATES = ['CAC40', 'CAC', 'FCHI'];

// Yahoo Finance's chart endpoint — unofficial and undocumented (Yahoo killed
// its real public API around 2017), but free and keyless, unlike Twelve
// Data. Used as the primary CAC 40 source specifically because no
// TWELVE_DATA_API_KEY is configured; Twelve Data below stays as a secondary
// attempt for whenever one is. Accepted risk, explicitly: this endpoint can
// be rate-limited or change shape without notice — degrades to "no value"
// like every other source here rather than ever guessing a number.
const YAHOO_CAC40_URL = 'https://query1.finance.yahoo.com/v8/finance/chart/%5EFCHI';

// Alpha Vantage's GLOBAL_QUOTE is built for individual tickers, and its
// coverage of raw indices (as opposed to index-tracking ETFs) is inconsistent
// — the exact symbol that resolves the CAC 40 hasn't been verified against
// the live API from this sandbox (no outbound access), so several plausible
// candidates are tried and the raw response is logged if every one fails,
// same diagnostic pattern as CAC40_SYMBOL_CANDIDATES above. Free tier is
// capped at 25 requests/day, so this only ever runs as a fallback once
// Yahoo has already failed — never on the common path.
const ALPHA_VANTAGE_SYMBOL_CANDIDATES = ['^FCHI', 'FCHI', 'PX1'];

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
  private btcCache: CachedFx | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly marketIndicators: MarketIndicatorsService,
  ) {}

  /** Bitcoin/EUR — CoinGecko's public price endpoint, free, no key required. */
  private async fetchBtc(): Promise<CachedFx | null> {
    if (this.btcCache && Date.now() - this.btcCache.fetchedAt < BTC_CACHE_TTL_MS) {
      return this.btcCache;
    }
    try {
      const res = await fetch(BTC_URL, { signal: AbortSignal.timeout(4000) });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as { bitcoin?: { eur: number; eur_24h_change: number } };
      if (data.bitcoin?.eur === undefined) throw new Error('unexpected response shape');

      this.btcCache = { value: data.bitcoin.eur, changePct: data.bitcoin.eur_24h_change ?? null, fetchedAt: Date.now() };
      return this.btcCache;
    } catch (error) {
      this.logger.warn(`BTC/EUR fetch failed: ${(error as Error).message}`);
      return this.btcCache; // serve last known value if we have one, else null
    }
  }

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

  private async fetchCac40FromYahoo(): Promise<CachedIndex | null> {
    try {
      const res = await fetch(YAHOO_CAC40_URL, {
        signal: AbortSignal.timeout(4000),
        // Yahoo's unofficial endpoint rejects requests with no User-Agent (or
        // a non-browser one) more often than not — a plain browser UA is the
        // documented workaround across every community client that uses it.
        headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = (await res.json()) as {
        chart?: { result?: { meta?: { regularMarketPrice?: number; previousClose?: number; chartPreviousClose?: number } }[] };
      };
      const meta = data.chart?.result?.[0]?.meta;
      if (typeof meta?.regularMarketPrice !== 'number') throw new Error('unexpected response shape');

      const value = meta.regularMarketPrice;
      const previousClose = meta.previousClose ?? meta.chartPreviousClose;
      const changePct = typeof previousClose === 'number' && previousClose !== 0 ? ((value - previousClose) / previousClose) * 100 : null;

      this.logger.log('CAC 40 resolved with Yahoo Finance');
      return { value, changePct, fetchedAt: Date.now() };
    } catch (error) {
      this.logger.warn(`Yahoo Finance CAC 40 fetch failed: ${(error as Error).message}`);
      return null;
    }
  }

  private async fetchCac40FromAlphaVantage(): Promise<CachedIndex | null> {
    const apiKey = this.config.get<string>('marketData.alphaVantageApiKey');
    if (!apiKey) return null; // not configured — omitted, not an error

    for (const symbol of ALPHA_VANTAGE_SYMBOL_CANDIDATES) {
      try {
        const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${apiKey}`;
        const res = await fetch(url, { signal: AbortSignal.timeout(4000) });
        const data = (await res.json()) as {
          Note?: string;
          Information?: string;
          'Global Quote'?: { '05. price'?: string; '10. change percent'?: string };
        };
        const quote = data['Global Quote'];
        if (!res.ok || !quote?.['05. price']) {
          this.logger.warn(`Alpha Vantage CAC 40 symbol "${symbol}" failed: ${data.Note ?? data.Information ?? `HTTP ${res.status}`}`);
          continue;
        }
        const value = Number(quote['05. price']);
        if (Number.isNaN(value)) {
          this.logger.warn(`Alpha Vantage CAC 40 symbol "${symbol}" returned an unexpected shape: ${JSON.stringify(data)}`);
          continue;
        }
        this.logger.log(`CAC 40 resolved with Alpha Vantage symbol "${symbol}"`);
        return {
          value,
          changePct: quote['10. change percent'] ? Number(quote['10. change percent'].replace('%', '')) : null,
          fetchedAt: Date.now(),
        };
      } catch (error) {
        this.logger.warn(`Alpha Vantage CAC 40 fetch failed for symbol "${symbol}": ${(error as Error).message}`);
      }
    }
    return null;
  }

  private async fetchCac40(): Promise<CachedIndex | null> {
    if (this.cac40Cache && Date.now() - this.cac40Cache.fetchedAt < INDEX_CACHE_TTL_MS) {
      return this.cac40Cache;
    }

    const yahoo = await this.fetchCac40FromYahoo();
    if (yahoo) {
      this.cac40Cache = yahoo;
      return this.cac40Cache;
    }

    const alphaVantage = await this.fetchCac40FromAlphaVantage();
    if (alphaVantage) {
      this.cac40Cache = alphaVantage;
      return this.cac40Cache;
    }

    const apiKey = this.config.get<string>('marketData.twelveDataApiKey');
    if (!apiKey) return this.cac40Cache; // Twelve Data not configured either — everything above already failed, serve last known value if any

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
    const [fx, cac40, btc, indicators, aumAgg, activeCount] = await Promise.all([
      this.fetchFx(),
      this.fetchCac40(),
      this.fetchBtc(),
      this.marketIndicators.summary(),
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
      btcEur: btc ? { value: btc.value, changePct: btc.changePct, degraded: false } : { value: null, changePct: null, degraded: true },
      // Eurostat's OAT 10Y series is monthly (irt_lt_mcby_m), not intraday —
      // shown without a change badge on purpose, so it never reads as a
      // live daily delta the way eurUsd/cac40/btcEur's changePct do.
      fr10y:
        indicators.oat10y.value !== null
          ? { value: indicators.oat10y.value, period: indicators.oat10y.period, degraded: false }
          : { value: null, period: null, degraded: true },
      aum: { value: Number(aumAgg._sum.amountRaised ?? 0) },
      activeDeals: { value: activeCount },
      asOf: new Date().toISOString(),
    };
  }
}
