import { Module } from '@nestjs/common';
import { RiskEngineService } from './risk-engine.service';
import { RiskEngineController } from './risk-engine.controller';
import { RiskModelController } from './risk-model.controller';
import { AlertsModule } from '../alerts/alerts.module';
import { RiskDataModule } from '../risk-data/risk-data.module';

@Module({
  imports: [AlertsModule, RiskDataModule],
  providers: [RiskEngineService],
  controllers: [RiskEngineController, RiskModelController],
  exports: [RiskEngineService],
})
export class RiskEngineModule {}
