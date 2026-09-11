import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';

@Module({
  controllers: [FractionalProjectsController, MarketDataController],
  providers: [FractionalProjectsService, MarketDataService],
})
export class FractionalModule {}
