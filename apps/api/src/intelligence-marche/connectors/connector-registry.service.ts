import { Injectable } from '@nestjs/common';
import { NewsConnector } from './connector.interface';
import { DataGouvConnector } from './data-gouv.connector';
import { ManualConnector } from './manual.connector';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors: Map<string, NewsConnector>;

  constructor(dataGouv: DataGouvConnector, manual: ManualConnector) {
    this.connectors = new Map<string, NewsConnector>([
      [dataGouv.key, dataGouv],
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
