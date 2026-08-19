import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { GeocodingService } from './geocoding.service';
import { GeocodingBackfillService } from './geocoding-backfill.service';
import { DeadlineAlertsService } from './deadline-alerts.service';
import { CompanyMonitoringService } from './company-monitoring.service';
import { RiskDataService } from './risk-data.service';
import { ActivitiesModule } from '../activities/activities.module';
import { SearchModule } from '../search/search.module';
import { AlertsModule } from '../alerts/alerts.module';
import { TasksModule } from '../tasks/tasks.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [ActivitiesModule, SearchModule, AlertsModule, TasksModule, StorageModule],
  providers: [DealsService, GeocodingService, GeocodingBackfillService, DeadlineAlertsService, CompanyMonitoringService, RiskDataService],
  controllers: [DealsController],
  exports: [DealsService],
})
export class DealsModule {}
