import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';
import { MarketDataController } from './market-data.controller';
import { MarketDataService } from './market-data.service';
import { FitScoringController } from './fit-scoring.controller';
import { FitScoringService } from './fit-scoring.service';
import { DataProvenanceController } from './data-provenance.controller';
import { DataProvenanceService } from './data-provenance.service';
import { DataRoomController } from './data-room.controller';
import { DataRoomService } from './data-room.service';
import { EsgRiskController } from './esg-risk.controller';
import { EsgRiskService } from './esg-risk.service';
import { TechnicalDdController } from './technical-dd.controller';
import { TechnicalDdService } from './technical-dd.service';
import { LegalTaxDdController } from './legal-tax-dd.controller';
import { LegalTaxDdService } from './legal-tax-dd.service';
import { FractionalLegalAlertsService } from './fractional-legal-alerts.service';
import { AlertsModule } from '../alerts/alerts.module';
import { IntelligenceMarcheModule } from '../intelligence-marche/intelligence-marche.module';

@Module({
  imports: [AlertsModule, IntelligenceMarcheModule],
  controllers: [
    FractionalProjectsController,
    MarketDataController,
    FitScoringController,
    DataProvenanceController,
    DataRoomController,
    EsgRiskController,
    TechnicalDdController,
    LegalTaxDdController,
  ],
  providers: [
    FractionalProjectsService,
    MarketDataService,
    FitScoringService,
    DataProvenanceService,
    DataRoomService,
    EsgRiskService,
    TechnicalDdService,
    LegalTaxDdService,
    FractionalLegalAlertsService,
  ],
})
export class FractionalModule {}
