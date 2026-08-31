import { Module } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { EntityMirrorService } from './entity-mirror.service';
import { EntityIntelligenceService } from './entity-intelligence.service';
import { EntityGraphController } from './entity-graph.controller';

@Module({
  providers: [RelationshipsService, EntityMirrorService, EntityIntelligenceService],
  controllers: [EntityGraphController],
  exports: [RelationshipsService, EntityMirrorService],
})
export class EntityGraphModule {}
