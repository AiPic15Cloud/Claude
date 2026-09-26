import { Module } from '@nestjs/common';
import { ActivitiesModule } from '../activities/activities.module';
import { ProjectMilestonesController } from './project-milestones.controller';
import { ProjectMilestonesService } from './project-milestones.service';

@Module({
  imports: [ActivitiesModule],
  controllers: [ProjectMilestonesController],
  providers: [ProjectMilestonesService],
  exports: [ProjectMilestonesService],
})
export class ProjectMilestonesModule {}
