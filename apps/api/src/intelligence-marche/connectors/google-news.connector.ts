import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ConnectorArticle, NewsConnector } from './connector.interface';
import { inferCategory } from './keyword-taxonomy';

const DEFAULT_QUERY = 'immobilier France OR "crowdfunding immobilier" OR "taux immobilier" OR "marché immobilier"';

// Google News serves a region/language-scoped "edition" — the fr/FR one
// mostly indexes French-language press, so English-primary outlets (FT,
// Bloomberg, Reuters) return next to nothing there even when the query
// itself is well-formed. A leading "en:" on the stored query (NewsSource.url
// doubles as the search query for this connector, see DEFAULT_SOURCES)
// switches to the US/English edition where those outlets actually appear.
const EN_PREFIX = 'en:';

/**
 * Real editorial news via Google News' public RSS search feed — free, no
 * API key. Unlike Yahoo Finance (a single price point) or data.gouv.fr
 * (dataset metadata), this returns actual article headlines, summaries and
 * links to the originating outlet, aggregated across the French press.
 * Not an officially documented API — just a widely-used public RSS
 * endpoint — so it degrades to an empty list rather than throwing if
 * Google ever changes or rate-limits it.
 */
@Injectable()
export class GoogleNewsConnector implements NewsConnector {
  readonly key = 'google-news-rss';
  readonly label = 'Google News — Actualités immobilier & finance';
  private readonly logger = new Logger(GoogleNewsConnector.name);

  async fetchArticles(sourceUrl: string | null): Promise<ConnectorArticle[]> {
    const raw = sourceUrl || DEFAULT_QUERY;
    const isEnglish = raw.startsWith(EN_PREFIX);
    const query = isEnglish ? raw.slice(EN_PREFIX.length) : raw;
    const edition = isEnglish ? 'hl=en-US&gl=US&ceid=US:en' : 'hl=fr&gl=FR&ceid=FR:fr';
    const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&${edition}`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`Google News RSS responded ${response.status} for query "${query}"`);
        return [];
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = $('item').toArray();
      if (items.length === 0) {
        this.logger.warn(`Google News RSS returned no items for query "${query}"`);
        return [];
      }

      const articles: ConnectorArticle[] = [];
      for (const el of items) {
        const item = $(el);
        const title = item.find('title').first().text().trim();
        if (!title) continue;
        const link = item.find('link').first().text().trim();
        const pubDate = item.find('pubDate').first().text().trim();
        const sourceName = item.find('source').first().text().trim();

        articles.push({
          title: sourceName && title.endsWith(sourceName) ? title.slice(0, -(sourceName.length + 3)).trim() : title,
          summary: sourceName ? `Source : ${sourceName}` : undefined,
          url: link || undefined,
          category: inferCategory(title),
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
        });
      }
      this.logger.log(`Google News RSS returned ${articles.length} article(s) for query "${query}"`);
      return articles;
    } catch (error) {
      this.logger.warn(`Google News RSS fetch failed for query "${query}": ${(error as Error).message}`);
      return [];
    }
  }
}
