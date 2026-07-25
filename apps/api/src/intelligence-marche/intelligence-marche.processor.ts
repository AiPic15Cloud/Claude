import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { IntelligenceMarcheService } from './intelligence-marche.service';

@Processor('market-intelligence')
export class IntelligenceMarcheProcessor extends WorkerHost {
  private readonly logger = new Logger(IntelligenceMarcheProcessor.name);

  constructor(private readonly service: IntelligenceMarcheService) {
    super();
  }

  async process(job: Job<{ sourceId: string }>) {
    const { sourceId } = job.data;
    const result = await this.service.ingestSource(sourceId);
    this.logger.log(`Source ${sourceId}: ${result.created} nouvel(le)(s) article(s) ingéré(s)`);
    return result;
  }
}
