import { Module } from '@nestjs/common';
import { InterestPaymentsService } from './interest-payments.service';
import { InterestPaymentsController } from './interest-payments.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  providers: [InterestPaymentsService],
  controllers: [InterestPaymentsController],
})
export class InterestPaymentsModule {}
