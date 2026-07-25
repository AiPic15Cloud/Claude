import { Module } from '@nestjs/common';
import { CockpitService } from './cockpit.service';
import { CockpitController } from './cockpit.controller';
import { DealsModule } from '../deals/deals.module';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [DealsModule, ActivitiesModule],
  providers: [CockpitService],
  controllers: [CockpitController],
})
export class CockpitModule {}
