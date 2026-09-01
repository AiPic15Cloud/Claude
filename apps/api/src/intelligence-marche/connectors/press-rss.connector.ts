import { Injectable, Logger } from '@nestjs/common';
import * as cheerio from 'cheerio';
import { ConnectorArticle, NewsConnector } from './connector.interface';
import { inferCategory, isRealEstateRelevant } from './keyword-taxonomy';

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

/**
 * Direct publisher RSS — Le Monde, Le Figaro, France Info all publish free,
 * keyless RSS feeds (same "no API key" idea as Google News, but straight
 * from the outlet). Unlike Google News' search RSS, a fixed publisher feed
 * can't be queried by topic — one NewsSource here covers the whole
 * "Économie" desk of that outlet — so relevance is judged after the fact
 * via isRealEstateRelevant, same taxonomy Google News' connector uses.
 */
@Injectable()
export class PressRssConnector implements NewsConnector {
  readonly key = 'press-rss';
  readonly label = 'Presse française — flux RSS';
  private readonly logger = new Logger(PressRssConnector.name);

  async fetchArticles(sourceUrl: string | null): Promise<ConnectorArticle[]> {
    if (!sourceUrl) {
      this.logger.warn('press-rss source has no feed URL configured');
      return [];
    }

    try {
      const response = await fetch(sourceUrl, {
        headers: {
          Accept: 'application/rss+xml, application/xml, text/xml',
          'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`Press RSS responded ${response.status} for "${sourceUrl}"`);
        return [];
      }

      const xml = await response.text();
      const $ = cheerio.load(xml, { xmlMode: true });
      const items = $('item').toArray();
      if (items.length === 0) {
        this.logger.warn(`Press RSS returned no items for "${sourceUrl}"`);
        return [];
      }

      const articles: ConnectorArticle[] = [];
      for (const el of items) {
        const item = $(el);
        const title = item.find('title').first().text().trim();
        if (!title) continue;

        const summary = stripHtml(item.find('description').first().text()).slice(0, 300);
        if (!isRealEstateRelevant(`${title} ${summary}`)) continue;

        const link = item.find('link').first().text().trim();
        const pubDate = item.find('pubDate').first().text().trim();

        articles.push({
          title,
          summary: summary || undefined,
          url: link || undefined,
          category: inferCategory(`${title} ${summary}`),
          publishedAt: pubDate ? new Date(pubDate) : new Date(),
        });
      }
      this.logger.log(`Press RSS kept ${articles.length}/${items.length} relevant article(s) from "${sourceUrl}"`);
      return articles;
    } catch (error) {
      this.logger.warn(`Press RSS fetch failed for "${sourceUrl}": ${(error as Error).message}`);
      return [];
    }
  }
}
