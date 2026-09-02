import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { GeocodingService } from './geocoding.service';
import { GeocodingBackfillService } from './geocoding-backfill.service';
import { DeadlineAlertsService } from './deadline-alerts.service';
import { DurationTargetAlertsService } from './duration-target-alerts.service';
import { CovenantAlertsService } from './covenant-alerts.service';
import { CompanyMonitoringService } from './company-monitoring.service';
import { MarketPriceService } from './market-price/market-price.service';
import { ActivitiesModule } from '../activities/activities.module';
import { SearchModule } from '../search/search.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TasksModule } from '../tasks/tasks.module';
import { StorageModule } from '../common/storage/storage.module';
import { RiskDataModule } from '../risk-data/risk-data.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { FieldChangeModule } from '../field-changes/field-change.module';
import { GraphModule } from '../graph/graph.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';
import { PlaybooksModule } from '../playbooks/playbooks.module';

@Module({
  imports: [
    ActivitiesModule,
    SearchModule,
    AlertsModule,
    TasksModule,
    StorageModule,
    RiskDataModule,
    RiskEngineModule,
    FieldChangeModule,
    GraphModule,
    EntityGraphModule,
    PlaybooksModule,
  ],
  providers: [
    DealsService,
    GeocodingService,
    GeocodingBackfillService,
    DeadlineAlertsService,
    DurationTargetAlertsService,
    CovenantAlertsService,
    CompanyMonitoringService,
    MarketPriceService,
  ],
  controllers: [DealsController],
  exports: [DealsService],
})
export class DealsModule {}
