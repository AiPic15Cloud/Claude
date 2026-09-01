import { Module } from '@nestjs/common';
import { CockpitService } from './cockpit.service';
import { CockpitController } from './cockpit.controller';
import { DealsModule } from '../deals/deals.module';
import { ActivitiesModule } from '../activities/activities.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';

@Module({
  imports: [DealsModule, ActivitiesModule, RiskEngineModule],
  providers: [CockpitService],
  controllers: [CockpitController],
})
export class CockpitModule {}
