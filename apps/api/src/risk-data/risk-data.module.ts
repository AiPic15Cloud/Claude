import { Module } from '@nestjs/common';
import { RiskDataService } from './risk-data.service';

@Module({
  providers: [RiskDataService],
  exports: [RiskDataService],
})
export class RiskDataModule {}
