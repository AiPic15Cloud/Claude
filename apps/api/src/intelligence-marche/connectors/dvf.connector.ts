import { Injectable, Logger } from '@nestjs/common';
import { ArticleCategory } from '@prisma/client';
import { ConnectorArticle, NewsConnector } from './connector.interface';

interface DvfResource {
  id: string;
  title: string;
  description?: string;
  last_modified?: string;
  url?: string;
}

interface DvfDataset {
  title: string;
  page: string;
  description?: string;
  last_modified?: string;
  resources: DvfResource[];
}

// The two specific DVF (Demandes de valeurs foncières) resources requested —
// full France, geolocated and non-geolocated extracts of the official
// property-transaction register.
const TRACKED_RESOURCE_IDS = ['902db087-b0eb-4cbb-a968-0b499bde5bc4', '99a26050-b94f-4ffc-9eb0-73ed28a895d1'];

/**
 * Surfaces updates to data.gouv.fr's DVF (Demandes de valeurs foncières)
 * dataset — France's official record of real-estate transaction prices —
 * as articles. Reads only the dataset's metadata (title/description/last
 * update date), never downloads the underlying multi-gigabyte CSV extract.
 */
@Injectable()
export class DvfConnector implements NewsConnector {
  readonly key = 'data-gouv-dvf';
  readonly label = 'data.gouv.fr — Valeurs foncières (DVF)';
  private readonly logger = new Logger(DvfConnector.name);
  private readonly endpoint = 'https://www.data.gouv.fr/api/1/datasets/demandes-de-valeurs-foncieres/';

  async fetchArticles(): Promise<ConnectorArticle[]> {
    try {
      const response = await fetch(this.endpoint, {
        headers: { Accept: 'application/json', 'User-Agent': 'AtlasRealEstateOS/1.0 (+https://atlas.app; veille immobiliere)' },
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) {
        this.logger.warn(`data.gouv.fr (DVF) responded ${response.status}`);
        return [];
      }
      const dataset = (await response.json()) as DvfDataset;
      if (!Array.isArray(dataset.resources)) {
        this.logger.warn('data.gouv.fr (DVF) returned an unexpected shape');
        return [];
      }

      const tracked = dataset.resources.filter((r) => TRACKED_RESOURCE_IDS.includes(r.id));
      const resources = tracked.length > 0 ? tracked : dataset.resources.slice(0, 2);

      return resources.map((resource) => ({
        title: `DVF — ${resource.title}`,
        summary: (resource.description || dataset.description)?.slice(0, 400),
        url: dataset.page,
        category: ArticleCategory.IMMOBILIER,
        publishedAt: resource.last_modified
          ? new Date(resource.last_modified)
          : dataset.last_modified
            ? new Date(dataset.last_modified)
            : new Date(),
      }));
    } catch (error) {
      this.logger.warn(`data.gouv.fr (DVF) fetch failed: ${(error as Error).message}`);
      return [];
    }
  }
}
