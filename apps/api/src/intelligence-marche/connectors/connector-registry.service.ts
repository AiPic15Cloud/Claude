import { Injectable } from '@nestjs/common';
import { NewsConnector } from './connector.interface';
import { DataGouvConnector } from './data-gouv.connector';
import { DvfConnector } from './dvf.connector';
import { GoogleNewsConnector } from './google-news.connector';
import { PressRssConnector } from './press-rss.connector';
import { ManualConnector } from './manual.connector';

@Injectable()
export class ConnectorRegistryService {
  private readonly connectors: Map<string, NewsConnector>;

  constructor(
    dataGouv: DataGouvConnector,
    dvf: DvfConnector,
    googleNews: GoogleNewsConnector,
    pressRss: PressRssConnector,
    manual: ManualConnector,
  ) {
    this.connectors = new Map<string, NewsConnector>([
      [dataGouv.key, dataGouv],
      [dvf.key, dvf],
      [googleNews.key, googleNews],
      [pressRss.key, pressRss],
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
