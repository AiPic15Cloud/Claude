import { Module } from '@nestjs/common';
import { FieldChangeService } from './field-change.service';
import { FieldChangeController } from './field-change.controller';
import { DataValidationService } from './data-validation.service';
import { DataValidationController } from './data-validation.controller';

@Module({
  providers: [FieldChangeService, DataValidationService],
  controllers: [FieldChangeController, DataValidationController],
  exports: [FieldChangeService, DataValidationService],
})
export class FieldChangeModule {}
