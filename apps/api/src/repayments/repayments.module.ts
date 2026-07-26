import { Module } from '@nestjs/common';
import { RepaymentsService } from './repayments.service';
import { RepaymentsController } from './repayments.controller';
import { RepaymentsSummaryController } from './repayments-summary.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  providers: [RepaymentsService],
  controllers: [RepaymentsController, RepaymentsSummaryController],
})
export class RepaymentsModule {}
