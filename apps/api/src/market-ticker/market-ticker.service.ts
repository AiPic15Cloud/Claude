import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

interface CachedFx {
  value: number;
  changePct: number | null;
  fetchedAt: number;
}

const FX_CACHE_TTL_MS = 5 * 60 * 1000;
const FX_URL = 'https://api.frankfurter.app/latest?from=EUR&to=USD';
const FX_YESTERDAY_URL = (date: string) => `https://api.frankfurter.app/${date}?from=EUR&to=USD`;

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

  constructor(private readonly prisma: PrismaService) {}

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

  async summary(organizationId: string) {
    const [fx, aumAgg, activeCount] = await Promise.all([
      this.fetchFx(),
      this.prisma.deal.aggregate({
        where: { organizationId, status: 'ACTIVE' },
        _sum: { amountRaised: true },
      }),
      this.prisma.deal.count({ where: { organizationId, status: 'ACTIVE' } }),
    ]);

    return {
      eurUsd: fx ? { value: fx.value, changePct: fx.changePct, degraded: false } : { value: null, changePct: null, degraded: true },
      aum: { value: Number(aumAgg._sum.amountRaised ?? 0) },
      activeDeals: { value: activeCount },
      asOf: new Date().toISOString(),
    };
  }
}
