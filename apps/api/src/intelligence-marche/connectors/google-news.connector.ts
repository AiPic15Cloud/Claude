import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ArticleCategory } from '@prisma/client';
import { ConnectorArticle, NewsConnector } from './connector.interface';

const DEFAULT_QUERY = 'immobilier France OR "crowdfunding immobilier" OR "taux immobilier" OR "marché immobilier"';

const CATEGORY_KEYWORDS: [ArticleCategory, string[]][] = [
  ['TAUX', ['taux', 'bce', 'banque centrale']],
  ['INFLATION', ['inflation']],
  ['CONSTRUCTION', ['construction', 'permis de construire', 'btp', 'chantier']],
  ['LOGISTIQUE', ['logistique', 'entrepôt']],
  ['COMMERCE', ['commerce', 'bureaux', 'retail']],
  ['RESIDENTIEL', ['résidentiel', 'logement', 'location']],
  ['REGLEMENTATION', ['loi', 'décret', 'réglementation', 'fiscalité']],
  ['IMMOBILIER', ['immobilier', 'foncier', 'crowdfunding']],
];

function inferCategory(text: string): ArticleCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return ArticleCategory.AUTRE;
}

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
    const query = sourceUrl || DEFAULT_QUERY;
    const endpoint = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=fr&gl=FR&ceid=FR:fr`;

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
