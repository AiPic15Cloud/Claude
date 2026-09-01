import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController, FinancialExtractionController } from './agents.controller';
import { DocumentsModule } from '../documents/documents.module';
import { RiskEngineModule } from '../risk-engine/risk-engine.module';
import { RiskDataModule } from '../risk-data/risk-data.module';
import { ActivitiesModule } from '../activities/activities.module';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [DocumentsModule, RiskEngineModule, RiskDataModule, ActivitiesModule, GraphModule],
  providers: [AgentsService],
  controllers: [AgentsController, FinancialExtractionController],
})
export class AgentsModule {}
