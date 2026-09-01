import { Module } from '@nestjs/common';
import { PlaybooksService } from './playbooks.service';
import { PlaybooksController } from './playbooks.controller';
import { TasksModule } from '../tasks/tasks.module';
import { AlertsModule } from '../alerts/alerts.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';

@Module({
  imports: [TasksModule, AlertsModule, EntityGraphModule],
  providers: [PlaybooksService],
  controllers: [PlaybooksController],
  exports: [PlaybooksService],
})
export class PlaybooksModule {}
