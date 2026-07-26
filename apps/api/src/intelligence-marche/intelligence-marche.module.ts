import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { IntelligenceMarcheService } from './intelligence-marche.service';
import { MarketIndicatorsService } from './indicators.service';
import { IntelligenceMarcheController } from './intelligence-marche.controller';
import { IntelligenceMarcheProcessor } from './intelligence-marche.processor';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { DataGouvConnector } from './connectors/data-gouv.connector';
import { ManualConnector } from './connectors/manual.connector';
import { AlertsModule } from '../alerts/alerts.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [BullModule.registerQueue({ name: 'market-intelligence' }), AlertsModule, SearchModule],
  providers: [
    IntelligenceMarcheService,
    MarketIndicatorsService,
    IntelligenceMarcheProcessor,
    ConnectorRegistryService,
    DataGouvConnector,
    ManualConnector,
  ],
  controllers: [IntelligenceMarcheController],
  exports: [IntelligenceMarcheService],
})
export class IntelligenceMarcheModule {}
