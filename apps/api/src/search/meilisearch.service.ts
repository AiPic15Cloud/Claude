import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MeiliSearch } from 'meilisearch';

export interface IndexedDeal {
  id: string;
  organizationId: string;
  name: string;
  reference: string;
  type: string;
  stage: string;
  city: string | null;
}

export interface IndexedEntity {
  id: string;
  organizationId: string;
  name: string;
  type: string;
  city: string | null;
}

export interface IndexedArticle {
  id: string;
  organizationId: string;
  title: string;
  summary: string | null;
  category: string;
  publishedAt: string;
}

const DEALS_INDEX = 'atlas_deals';
const ENTITIES_INDEX = 'atlas_entities';
const ARTICLES_INDEX = 'atlas_articles';

/**
 * Thin wrapper around the Meilisearch client. Every call is defensive —
 * Meilisearch is an optional-at-runtime search accelerator (the app's data
 * of record stays in PostgreSQL), so a down or unconfigured instance logs a
 * warning and never breaks the request that triggered indexing.
 */
@Injectable()
export class MeilisearchService implements OnModuleInit {
  private readonly logger = new Logger(MeilisearchService.name);
  private readonly client: MeiliSearch;
  private available = false;

  constructor(private readonly config: ConfigService) {
    this.client = new MeiliSearch({
      host: this.config.get<string>('meilisearch.host')!,
      apiKey: this.config.get<string>('meilisearch.apiKey'),
    });
  }

  async onModuleInit() {
    try {
      await this.client.health();
      await Promise.all([
        this.client.createIndex(DEALS_INDEX, { primaryKey: 'id' }).catch(() => undefined),
        this.client.createIndex(ENTITIES_INDEX, { primaryKey: 'id' }).catch(() => undefined),
        this.client.createIndex(ARTICLES_INDEX, { primaryKey: 'id' }).catch(() => undefined),
      ]);
      await this.client.index(DEALS_INDEX).updateFilterableAttributes(['organizationId']);
      await this.client.index(ENTITIES_INDEX).updateFilterableAttributes(['organizationId']);
      await this.client.index(ARTICLES_INDEX).updateFilterableAttributes(['organizationId']);
      this.available = true;
      this.logger.log('Meilisearch connecté — index prêts');
    } catch (error) {
      this.available = false;
      this.logger.warn(
        `Meilisearch indisponible (${(error as Error).message}) — la recherche universelle sera dégradée ` +
          'jusqu\'à ce que le service soit accessible.',
      );
    }
  }

  async indexDeal(doc: IndexedDeal) {
    await this.safe(() => this.client.index(DEALS_INDEX).addDocuments([doc]));
  }

  async removeDeal(id: string) {
    await this.safe(() => this.client.index(DEALS_INDEX).deleteDocument(id));
  }

  async indexEntity(doc: IndexedEntity) {
    await this.safe(() => this.client.index(ENTITIES_INDEX).addDocuments([doc]));
  }

  async removeEntity(id: string) {
    await this.safe(() => this.client.index(ENTITIES_INDEX).deleteDocument(id));
  }

  async indexArticle(doc: IndexedArticle) {
    await this.safe(() => this.client.index(ARTICLES_INDEX).addDocuments([doc]));
  }

  async search(organizationId: string, query: string) {
    if (!this.available || !query.trim()) return { deals: [], entities: [], articles: [], degraded: !this.available };

    try {
      const filter = `organizationId = "${organizationId}"`;
      const result = await this.client.multiSearch({
        queries: [
          { indexUid: DEALS_INDEX, q: query, filter, limit: 6 },
          { indexUid: ENTITIES_INDEX, q: query, filter, limit: 6 },
          { indexUid: ARTICLES_INDEX, q: query, filter, limit: 6 },
        ],
      });
      const [deals, entities, articles] = result.results;
      return {
        deals: deals?.hits ?? [],
        entities: entities?.hits ?? [],
        articles: articles?.hits ?? [],
        degraded: false,
      };
    } catch (error) {
      this.logger.warn(`Meilisearch search failed: ${(error as Error).message}`);
      return { deals: [], entities: [], articles: [], degraded: true };
    }
  }

  private async safe(fn: () => Promise<unknown>) {
    if (!this.available) return;
    try {
      await fn();
    } catch (error) {
      this.logger.warn(`Meilisearch write failed: ${(error as Error).message}`);
    }
  }
}
