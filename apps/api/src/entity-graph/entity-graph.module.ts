import { Module } from '@nestjs/common';
import { RelationshipsService } from './relationships.service';
import { EntityMirrorService } from './entity-mirror.service';
import { EntityIntelligenceService } from './entity-intelligence.service';
import { ContagionService } from './contagion.service';
import { GroupBuilderService } from './group-builder.service';
import { LegalEventsService } from './legal-events.service';
import { EntityResolutionService } from './entity-resolution.service';
import { EntityGraphController } from './entity-graph.controller';
import { TasksModule } from '../tasks/tasks.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [TasksModule, AlertsModule],
  providers: [
    RelationshipsService,
    EntityMirrorService,
    EntityIntelligenceService,
    ContagionService,
    GroupBuilderService,
    LegalEventsService,
    EntityResolutionService,
  ],
  controllers: [EntityGraphController],
  exports: [
    RelationshipsService,
    EntityMirrorService,
    EntityIntelligenceService,
    ContagionService,
    GroupBuilderService,
    LegalEventsService,
    EntityResolutionService,
  ],
})
export class EntityGraphModule {}
