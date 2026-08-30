import { Module } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineController } from './risk-engine.controller';
import { RiskModelController } from './risk-model.controller';
import { RiskOverrideService } from './risk-override.service';
import { RiskHistoryService } from './risk-history.service';
import { DealOverrideService } from './deal-override.service';
import { DealOverrideController } from './deal-override.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { RiskDataModule } from '../risk-data/risk-data.module';
import { FinancialModelModule } from '../financial-model/financial-model.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [AlertsModule, RiskDataModule, FinancialModelModule, ActivitiesModule],
  providers: [RiskEngineService, RiskOverrideService, RiskHistoryService, DealOverrideService],
  controllers: [RiskEngineController, RiskModelController, DealOverrideController],
  exports: [RiskEngineService, RiskHistoryService],
})
export class RiskEngineModule {}
