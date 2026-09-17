import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { EntityLinkReviewService } from './entity-link-review.service';
import { ENRICHMENT_QUEUE } from './crowdfunding-watch.constants';

/**
 * Consommateur de la file d'enrichissement (spec §4 + §7) — chargé
 * uniquement par le worker. Toujours postérieur à la détection : ne retarde
 * jamais la première notification ("Nouvelle collecte annoncée"/"Collecte
 * ouverte"), qui part depuis la file de notification indépendamment.
 */
@Processor(ENRICHMENT_QUEUE)
export class EnrichmentProcessor extends WorkerHost {
  private readonly logger = new Logger(EnrichmentProcessor.name);

  constructor(private readonly entityLinkReview: EntityLinkReviewService) {
    super();
  }

  async process(job: Job<{ observationId: string }>): Promise<void> {
    if (job.name !== 'enrich-observation') {
      this.logger.warn(`Job d'enrichissement inconnu ignoré : "${job.name}"`);
      return;
    }
    await this.entityLinkReview.enrichObservation(job.data.observationId);
  }
}
