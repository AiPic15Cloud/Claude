import { ArticleCategory } from '@prisma/client';

export interface ConnectorArticle {
  title: string;
  summary?: string;
  url?: string;
  category: ArticleCategory;
  publishedAt: Date;
}

export interface NewsConnector {
  /** Unique key stored on NewsSource.connector, e.g. "data-gouv-catalogue". */
  readonly key: string;
  readonly label: string;
  fetchArticles(sourceUrl: string | null): Promise<ConnectorArticle[]>;
}
