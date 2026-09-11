import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { FractionalLegalAlertsService } from './fractional-legal-alerts.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [FractionalProjectsController, MarketDataController],
  providers: [FractionalProjectsService, MarketDataService, FractionalLegalAlertsService],
})
export class FractionalModule {}
