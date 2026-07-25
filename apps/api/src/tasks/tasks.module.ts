import { Module } from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TasksController } from './tasks.controller';
import { DealTasksController } from './deal-tasks.controller';
import { ActivitiesModule } from '../activities/activities.module';

@Module({
  imports: [ActivitiesModule],
  providers: [TasksService],
  controllers: [TasksController, DealTasksController],
  exports: [TasksService],
})
export class TasksModule {}
