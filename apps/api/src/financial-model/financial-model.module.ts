import { Module } from '@nestjs/common';
import { FinancialModelService } from './financial-model.service';
import { FinancialModelController } from './financial-model.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { FieldChangeModule } from '../field-changes/field-change.module';

@Module({
  imports: [ActivitiesModule, FieldChangeModule],
  providers: [FinancialModelService],
  controllers: [FinancialModelController],
  exports: [FinancialModelService],
})
export class FinancialModelModule {}
