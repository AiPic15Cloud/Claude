import { Module } from '@nestjs/common';
import { FinancialModelService } from './financial-model.service';
import { FinancialModelController } from './financial-model.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  providers: [FinancialModelService],
  controllers: [FinancialModelController],
})
export class FinancialModelModule {}
