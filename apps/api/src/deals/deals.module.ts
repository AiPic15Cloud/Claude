import { Module } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [ActivitiesModule, SearchModule],
  providers: [DealsService],
  controllers: [DealsController],
  exports: [DealsService],
})
export class DealsModule {}
