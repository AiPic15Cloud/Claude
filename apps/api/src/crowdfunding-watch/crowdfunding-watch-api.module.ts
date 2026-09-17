import { Module } from '@nestjs/common';
import { CrowdfundingWatchModule } from './crowdfunding-watch.module';
import { PlatformRegistryController } from './platform-registry.controller';
import { ProjectObservationController } from './project-observation.controller';
import { EntityLinkReviewController } from './entity-link-review.controller';

/** Importé uniquement par AppModule — les contrôleurs REST, jamais les `@Processor` (voir crowdfunding-watch-processors.module.ts). */
@Module({
  imports: [CrowdfundingWatchModule],
  controllers: [PlatformRegistryController, ProjectObservationController, EntityLinkReviewController],
})
export class CrowdfundingWatchApiModule {}
