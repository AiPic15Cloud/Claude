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
import { PlatformApplicationsController } from './platform-applications.controller';
import { PlatformApplicationsService } from './platform-applications.service';
import { StructureRevenueController } from './structure-revenue.controller';
import { StructureRevenueService } from './structure-revenue.service';
import { FractionalLegalAlertsService } from './fractional-legal-alerts.service';
import { FractionalActionItemsSweepService } from './fractional-action-items-sweep.service';
import { AlertsModule } from '../alerts/alerts.module';
import { IntelligenceMarcheModule } from '../intelligence-marche/intelligence-marche.module';
import { PdfExportModule } from '../pdf-export/pdf-export.module';
import { ActionItemsModule } from '../action-items/action-items.module';

@Module({
  imports: [AlertsModule, IntelligenceMarcheModule, PdfExportModule, ActionItemsModule],
  controllers: [
    FractionalProjectsController,
    MarketDataController,
    FitScoringController,
    DataProvenanceController,
    DataRoomController,
    EsgRiskController,
    TechnicalDdController,
    LegalTaxDdController,
    PlatformApplicationsController,
    StructureRevenueController,
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
    PlatformApplicationsService,
    StructureRevenueService,
    FractionalLegalAlertsService,
    FractionalActionItemsSweepService,
  ],
})
export class FractionalModule {}
