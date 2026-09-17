import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { SourceRegistryModule } from '../source-registry/source-registry.module';
import { EntityGraphModule } from '../entity-graph/entity-graph.module';
import { PlatformRegistryService } from './platform-registry.service';
import { ProjectObservationService } from './project-observation.service';
import { EntityLinkReviewService } from './entity-link-review.service';
import { DETECTION_QUEUE, ENRICHMENT_QUEUE, NOTIFICATION_QUEUE } from './crowdfunding-watch.constants';

/**
 * Module partagé (spec Lot 1 §7) — importé à la fois par le processus web
 * (CrowdfundingWatchApiModule) et par le worker Railway
 * (CrowdfundingWatchProcessorsModule). Ne contient AUCUN `@Processor` : ce
 * sont les seules classes qui font réellement tourner un consommateur
 * BullMQ, et elles ne doivent exister que dans le worker (voir
 * crowdfunding-watch-processors.module.ts) — sinon le processus web se
 * mettrait aussi à consommer des jobs, annulant la séparation détection/
 * enrichissement/notification demandée par la spec.
 */
@Module({
  imports: [
    BullModule.forRootAsync({
      useFactory: (config: ConfigService) => ({ connection: { url: config.get<string>('redis.url') } }),
      inject: [ConfigService],
    }),
    BullModule.registerQueue({ name: DETECTION_QUEUE }, { name: ENRICHMENT_QUEUE }, { name: NOTIFICATION_QUEUE }),
    SourceRegistryModule,
    EntityGraphModule,
  ],
  providers: [PlatformRegistryService, ProjectObservationService, EntityLinkReviewService],
  exports: [BullModule, PlatformRegistryService, ProjectObservationService, EntityLinkReviewService],
})
export class CrowdfundingWatchModule {}
