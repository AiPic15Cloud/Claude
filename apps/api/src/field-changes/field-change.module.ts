import { Module } from '@nestjs/common';
import { FieldChangeService } from './field-change.service';
import { FieldChangeController } from './field-change.controller';

@Module({
  providers: [FieldChangeService],
  controllers: [FieldChangeController],
  exports: [FieldChangeService],
})
export class FieldChangeModule {}
