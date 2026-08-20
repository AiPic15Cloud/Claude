import { Module } from '@nestjs/common';
import { FinancialModelService } from './financial-model.service';
import { FinancialModelController } from './financial-model.controller';
import { CostLineItemService } from './cost-line-item.service';
import { CostLineItemController } from './cost-line-item.controller';
import { SaleLotService } from './sale-lot.service';
import { SaleLotController } from './sale-lot.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { FieldChangeModule } from '../field-changes/field-change.module';

@Module({
  imports: [ActivitiesModule, FieldChangeModule],
  providers: [FinancialModelService, CostLineItemService, SaleLotService],
  controllers: [FinancialModelController, CostLineItemController, SaleLotController],
  exports: [FinancialModelService, CostLineItemService, SaleLotService],
})
export class FinancialModelModule {}
