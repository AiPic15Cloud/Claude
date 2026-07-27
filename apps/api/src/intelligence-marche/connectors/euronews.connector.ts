import { Injectable, Logger } from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import { ConnectorArticle, NewsConnector } from './connector.interface';

interface EuronewsItem {
  title?: string;
  headline?: string;
  url?: string;
  link?: string;
  publishedAt?: string;
  date?: string;
  pubDate?: string;
  description?: string;
  summary?: string;
}

const CATEGORY_KEYWORDS: [ArticleCategory, string[]][] = [
  ['TAUX', ['taux', 'bce', 'banque centrale', 'interest rate']],
  ['INFLATION', ['inflation', 'prix à la consommation']],
  ['CONSTRUCTION', ['construction', 'permis de construire', 'btp']],
  ['IMMOBILIER', ['immobilier', 'logement', 'foncier', 'real estate']],
];

function inferCategory(text: string): ArticleCategory {
  const lower = text.toLowerCase();
  for (const [category, keywords] of CATEGORY_KEYWORDS) {
    if (keywords.some((k) => lower.includes(k))) return category;
  }
  return ArticleCategory.AUTRE;
}

/** Accepts either a bare array or a common wrapper key ({ news | data | articles | items: [...] }). */
function extractItems(body: unknown): EuronewsItem[] {
  if (Array.isArray(body)) return body as EuronewsItem[];
  if (body && typeof body === 'object') {
    for (const key of ['news', 'data', 'articles', 'items', 'results']) {
      const value = (body as Record<string, unknown>)[key];
      if (Array.isArray(value)) return value as EuronewsItem[];
    }
  }
  return [];
}

/**
 * Real breaking-news feed from Euronews' public JSON endpoint. No API key.
 * The feed is general news (not real-estate specific), so items are
 * best-effort categorized by keyword and otherwise bucketed as AUTRE —
 * never dropped, never invented.
 */
@Injectable()
export class EuronewsConnector implements NewsConnector {
  readonly key = 'euronews-breaking';
  readonly label = 'Euronews — Actualités';
  private readonly logger = new Logger(EuronewsConnector.name);
  private readonly endpoint = 'https://ru.euronews.com/api/breaking-news.json';

  async fetchArticles(): Promise<ConnectorArticle[]> {
    try {
      const response = await fetch(this.endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`Euronews responded ${response.status}`);
        return [];
      }
      const body: unknown = await response.json();
      const items = extractItems(body);
      if (items.length === 0) {
        this.logger.warn('Euronews returned no recognizable items');
        return [];
      }

      const articles: ConnectorArticle[] = [];
      for (const item of items) {
        const title = item.title ?? item.headline;
        if (!title) continue;
        const dateStr = item.publishedAt ?? item.date ?? item.pubDate;
        articles.push({
          title,
          summary: item.description ?? item.summary,
          url: item.url ?? item.link,
          category: inferCategory(`${title} ${item.description ?? ''}`),
          publishedAt: dateStr ? new Date(dateStr) : new Date(),
        });
      }
      return articles;
    } catch (error) {
      this.logger.warn(`Euronews fetch failed: ${(error as Error).message}`);
      return [];
    }
  }
}
