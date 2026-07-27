import { Module } from '@nestjs/common';
import { IntelligenceMarcheService } from './intelligence-marche.service';
import { MarketIndicatorsService } from './indicators.service';
import { MarketDigestService } from './market-digest.service';
import { IntelligenceMarcheController } from './intelligence-marche.controller';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { DataGouvConnector } from './connectors/data-gouv.connector';
import { ManualConnector } from './connectors/manual.connector';
import { AlertsModule } from '../alerts/alerts.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [AlertsModule, SearchModule],
  providers: [
    IntelligenceMarcheService,
    MarketIndicatorsService,
    MarketDigestService,
    ConnectorRegistryService,
    DataGouvConnector,
    ManualConnector,
  ],
  controllers: [IntelligenceMarcheController],
  exports: [IntelligenceMarcheService],
})
export class IntelligenceMarcheModule {}
