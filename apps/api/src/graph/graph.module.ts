import { Module } from '@nestjs/common';
import { GraphService } from './graph.service';
import { GraphController } from './graph.controller';
import { DealEntitiesController } from './deal-entities.controller';
import { SearchModule } from '../search/search.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';

@Module({
  imports: [SearchModule, EntityGraphModule],
  providers: [GraphService],
  controllers: [GraphController, DealEntitiesController],
  exports: [GraphService],
})
export class GraphModule {}
