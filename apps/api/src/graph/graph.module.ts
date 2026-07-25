import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { DealEntitiesController } from './deal-entities.controller';
import { SearchModule } from '../search/search.module';

@Module({
  imports: [SearchModule],
  providers: [GraphService],
  controllers: [GraphController, DealEntitiesController],
  exports: [GraphService],
})
export class GraphModule {}
