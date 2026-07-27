import { Injectable, Logger } from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import { ConnectorArticle, NewsConnector } from './connector.interface';

interface YahooChartResponse {
  chart: {
    result?: [
      {
        meta: { regularMarketPrice?: number; previousClose?: number; regularMarketTime?: number; currency?: string };
      },
    ];
    error?: unknown;
  };
}

/**
 * Real BTC/USD snapshot from Yahoo Finance's public chart API (no key).
 * Produces one article per calendar day — the dedupe hash is keyed off a
 * date-only title, so re-collecting the same day never floods the feed
 * with a new entry every time the price ticks.
 */
@Injectable()
export class YahooFinanceConnector implements NewsConnector {
  readonly key = 'yahoo-finance-btc';
  readonly label = 'Yahoo Finance — BTC/USD';
  private readonly logger = new Logger(YahooFinanceConnector.name);

  async fetchArticles(): Promise<ConnectorArticle[]> {
    const endpoint = 'https://query1.finance.yahoo.com/v8/finance/chart/BTC-USD?range=5d&interval=1d';

    try {
      const response = await fetch(endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)' },
        signal: AbortSignal.timeout(10_000),
      });
      if (!response.ok) {
        this.logger.warn(`Yahoo Finance responded ${response.status}`);
        return [];
      }
      const body = (await response.json()) as YahooChartResponse;
      const meta = body.chart?.result?.[0]?.meta;
      if (!meta || meta.regularMarketPrice === undefined) {
        this.logger.warn('Yahoo Finance returned an unexpected shape');
        return [];
      }

      const price = meta.regularMarketPrice;
      const previous = meta.previousClose;
      const changePct = previous ? ((price - previous) / previous) * 100 : null;
      const now = meta.regularMarketTime ? new Date(meta.regularMarketTime * 1000) : new Date();
      const dateLabel = now.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

      const summary =
        changePct !== null
          ? `Cours : ${price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $ (${changePct >= 0 ? '+' : ''}${changePct.toFixed(1)} % vs clôture précédente ${previous!.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $).`
          : `Cours : ${price.toLocaleString('fr-FR', { maximumFractionDigits: 0 })} $.`;

      return [
        {
          title: `Bitcoin (BTC/USD) — ${dateLabel}`,
          summary,
          url: 'https://finance.yahoo.com/quote/BTC-USD',
          category: ArticleCategory.AUTRE,
          publishedAt: now,
        },
      ];
    } catch (error) {
      this.logger.warn(`Yahoo Finance fetch failed: ${(error as Error).message}`);
      return [];
    }
  }
}
