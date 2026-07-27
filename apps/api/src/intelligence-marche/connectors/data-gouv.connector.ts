import { Injectable, Logger } from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import { ConnectorArticle, NewsConnector } from './connector.interface';

interface DataGouvDataset {
  title: string;
  page: string;
  description?: string;
  last_modified?: string;
  tags?: string[];
}

interface DataGouvResponse {
  data: DataGouvDataset[];
}

function inferCategory(tags: string[] = []): ArticleCategory {
  const joined = tags.join(' ').toLowerCase();
  if (joined.includes('logement') || joined.includes('residentiel')) return ArticleCategory.RESIDENTIEL;
  if (joined.includes('construction') || joined.includes('permis')) return ArticleCategory.CONSTRUCTION;
  if (joined.includes('foncier') || joined.includes('immobilier')) return ArticleCategory.IMMOBILIER;
  if (joined.includes('commerce')) return ArticleCategory.COMMERCE;
  if (joined.includes('logistique') || joined.includes('transport')) return ArticleCategory.LOGISTIQUE;
  if (joined.includes('reglement') || joined.includes('droit')) return ArticleCategory.REGLEMENTATION;
  return ArticleCategory.AUTRE;
}

/**
 * Real connector against data.gouv.fr's public open-data catalogue search API
 * (no API key required: https://www.data.gouv.fr/api/1/datasets/?q=...).
 * Each matching dataset becomes one Article — this surfaces genuinely public
 * open-data releases (permis de construire, DVF, etc.), it does not fabricate
 * editorial content.
 */
@Injectable()
export class DataGouvConnector implements NewsConnector {
  readonly key = 'data-gouv-catalogue';
  readonly label = 'data.gouv.fr — Catalogue open data';
  private readonly logger = new Logger(DataGouvConnector.name);

  async fetchArticles(sourceUrl: string | null): Promise<ConnectorArticle[]> {
    const query = sourceUrl || 'immobilier logement construction permis de construire';
    const endpoint = `https://www.data.gouv.fr/api/1/datasets/?q=${encodeURIComponent(query)}&page_size=20`;

    try {
      const response = await fetch(endpoint, {
        headers: {
          Accept: 'application/json',
          // data.gouv.fr's CDN rejects requests with a generic/empty UA —
          // identify ourselves explicitly rather than looking like a bot.
          'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)',
        },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        const preview = await response.text().catch(() => '');
        this.logger.warn(`data.gouv.fr responded ${response.status} for query "${query}": ${preview.slice(0, 300)}`);
        return [];
      }
      const body = (await response.json()) as DataGouvResponse;
      if (!Array.isArray(body.data)) {
        this.logger.warn(`data.gouv.fr returned unexpected shape for query "${query}"`);
        return [];
      }
      this.logger.log(`data.gouv.fr returned ${body.data.length} dataset(s) for query "${query}"`);

      return body.data.map((dataset) => ({
        title: dataset.title,
        summary: dataset.description?.slice(0, 400),
        url: dataset.page,
        category: inferCategory(dataset.tags),
        publishedAt: dataset.last_modified ? new Date(dataset.last_modified) : new Date(),
      }));
    } catch (error) {
      this.logger.warn(`data.gouv.fr fetch failed: ${(error as Error).message}`);
      return [];
    }
  }
}
