import { Injectable } from '@nestjs/common';
import { ConnectorArticle, NewsConnector } from './connector.interface';

/**
 * Non-fetching connector for analyst-entered sources — articles are created
 * directly via the API rather than pulled by a scheduled job.
 */
@Injectable()
export class ManualConnector implements NewsConnector {
  readonly key = 'manual';
  readonly label = 'Saisie manuelle';

  async fetchArticles(): Promise<ConnectorArticle[]> {
    return [];
  }
}
