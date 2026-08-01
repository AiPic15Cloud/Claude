import { Module } from '@nestjs/common';
import { AgentsService } from './agents.service';
import { AgentsController, FinancialExtractionController } from './agents.controller';
import { ScoringModule } from '../scoring/scoring.module';
import { DocumentsModule } from '../documents/documents.module';

@Module({
  imports: [ScoringModule, DocumentsModule],
  providers: [AgentsService],
  controllers: [AgentsController, FinancialExtractionController],
})
export class AgentsModule {}
