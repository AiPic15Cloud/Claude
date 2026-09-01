import { Module } from '@nestjs/common';
import { GuaranteesService } from './guarantees.service';
import { GuaranteesController } from './guarantees.controller';
import { GuaranteeExpiryAlertsService } from './guarantee-expiry-alerts.service';
import { ActivitiesModule } from '../activities/activities.module';
import { AlertsModule } from '../alerts/alerts.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  imports: [ActivitiesModule, AlertsModule, RiskEngineModule],
  providers: [GuaranteesService, GuaranteeExpiryAlertsService],
  controllers: [GuaranteesController],
})
export class GuaranteesModule {}
