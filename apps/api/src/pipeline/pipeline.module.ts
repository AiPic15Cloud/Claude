import { Module } from '@nestjs/common';
import { DealsModule } from '../deals/deals.module';
import { PipelineService } from './pipeline.service';
import { PipelineController } from './pipeline.controller';

@Module({
  imports: [DealsModule],
  providers: [PipelineService],
  controllers: [PipelineController],
})
export class PipelineModule {}
