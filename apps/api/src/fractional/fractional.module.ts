import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { FitScoringController } from './fit-scoring.controller';
import { FitScoringService } from './fit-scoring.service';
import { DataProvenanceController } from './data-provenance.controller';
import { DataProvenanceService } from './data-provenance.service';
import { FractionalLegalAlertsService } from './fractional-legal-alerts.service';
import { AlertsModule } from '../alerts/alerts.module';
import { IntelligenceMarcheModule } from '../intelligence-marche/intelligence-marche.module';

@Module({
  imports: [AlertsModule, IntelligenceMarcheModule],
  controllers: [FractionalProjectsController, MarketDataController, FitScoringController, DataProvenanceController],
  providers: [FractionalProjectsService, MarketDataService, FitScoringService, DataProvenanceService, FractionalLegalAlertsService],
})
export class FractionalModule {}
