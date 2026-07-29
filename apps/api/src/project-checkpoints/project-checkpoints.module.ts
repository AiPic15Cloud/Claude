import { Module } from '@nestjs/common';
import { ProjectCheckpointsService } from './project-checkpoints.service';
import { ProjectCheckpointsController } from './project-checkpoints.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { FinancialModelModule } from '../financial-model/financial-model.module';

@Module({
  imports: [ActivitiesModule, FinancialModelModule],
  providers: [ProjectCheckpointsService],
  controllers: [ProjectCheckpointsController],
})
export class ProjectCheckpointsModule {}
