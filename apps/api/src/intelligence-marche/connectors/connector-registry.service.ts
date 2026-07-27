import { Injectable } from '@nestjs/common';
import { NewsConnector } from './connector.interface';
import { DataGouvConnector } from './data-gouv.connector';
import { DvfConnector } from './dvf.connector';
import { EuronewsConnector } from './euronews.connector';
import { YahooFinanceConnector } from './yahoo-finance.connector';
import { ManualConnector } from './manual.connector';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors: Map<string, NewsConnector>;

  constructor(
    dataGouv: DataGouvConnector,
    dvf: DvfConnector,
    euronews: EuronewsConnector,
    yahooFinance: YahooFinanceConnector,
    manual: ManualConnector,
  ) {
    this.connectors = new Map<string, NewsConnector>([
      [dataGouv.key, dataGouv],
      [dvf.key, dvf],
      [euronews.key, euronews],
      [yahooFinance.key, yahooFinance],
      [manual.key, manual],
    ]);
  }

  get(key: string): NewsConnector | undefined {
    return this.connectors.get(key);
  }

  list(): { key: string; label: string }[] {
    return [...this.connectors.values()].map(({ key, label }) => ({ key, label }));
  }
}
