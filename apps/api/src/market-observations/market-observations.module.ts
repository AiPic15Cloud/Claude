import { Module } from '@nestjs/common';
import { SourceRegistryModule } from '../source-registry/source-registry.module';
import { MarketObservationsService } from './market-observations.service';
import { MarketObservationsController } from './market-observations.controller';

@Module({
  imports: [SourceRegistryModule],
  providers: [MarketObservationsService],
  controllers: [MarketObservationsController],
})
export class MarketObservationsModule {}
