import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DealTasksController } from './deal-tasks.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { AlertsModule } from '../alerts/alerts.module';

@Module({
  imports: [ActivitiesModule, AlertsModule],
  providers: [TasksService],
  controllers: [TasksController, DealTasksController],
  exports: [TasksService],
})
export class TasksModule {}
