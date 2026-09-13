import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { FitScoringController } from './fit-scoring.controller';
import { FitScoringService } from './fit-scoring.service';
import { FractionalLegalAlertsService } from './fractional-legal-alerts.service';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [AlertsModule],
  controllers: [FractionalProjectsController, MarketDataController, FitScoringController],
  providers: [FractionalProjectsService, MarketDataService, FitScoringService, FractionalLegalAlertsService],
})
export class FractionalModule {}
