import { Module } from '@nestjs/common';
import { GuaranteesService } from './guarantees.service';
import { GuaranteesController } from './guarantees.controller';
import { GuaranteeExpiryAlertsService } from './guarantee-expiry-alerts.service';
import { ActivitiesModule } from '../activities/activities.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [ActivitiesModule, AlertsModule],
  providers: [GuaranteesService, GuaranteeExpiryAlertsService],
  controllers: [GuaranteesController],
})
export class GuaranteesModule {}
