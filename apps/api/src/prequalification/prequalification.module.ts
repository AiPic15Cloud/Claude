import { Module } from '@nestjs/common';
import { PrequalificationController } from './prequalification.controller';
import { PrequalificationService } from './prequalification.service';
import { EvidenceController } from './evidence.controller';
import { EvidenceService } from './evidence.service';
import { PrequalDocumentsController, PrequalLocalDocumentsController } from './documents.controller';
import { PrequalDocumentsService } from './documents.service';
import { ExtractionController } from './extraction.controller';
import { ExtractionService } from './extraction.service';
import { PromotionController } from './promotion.controller';
import { PromotionService } from './promotion.service';
import { ExposureController } from './exposure.controller';
import { ExposureService } from './exposure.service';
import { VersionsController } from './versions.controller';
import { VersionsService } from './versions.service';
import { DataRoomController } from './data-room.controller';
import { DataRoomService } from './data-room.service';
import { MarketStudyController } from './market-study.controller';
import { MarketStudyService } from './market-study.service';
import { StorageModule } from '../common/storage/storage.module';
import { ActivitiesModule } from '../activities/activities.module';
import { DealsModule } from '../deals/deals.module';
import { IntelligenceMarcheModule } from '../intelligence-marche/intelligence-marche.module';

@Module({
  imports: [StorageModule, ActivitiesModule, DealsModule, IntelligenceMarcheModule],
  controllers: [
    PrequalificationController,
    EvidenceController,
    PrequalDocumentsController,
    PrequalLocalDocumentsController,
    ExtractionController,
    PromotionController,
    ExposureController,
    VersionsController,
    DataRoomController,
    MarketStudyController,
  ],
  providers: [
    PrequalificationService,
    EvidenceService,
    PrequalDocumentsService,
    ExtractionService,
    PromotionService,
    ExposureService,
    VersionsService,
    DataRoomService,
    MarketStudyService,
  ],
  exports: [PrequalificationService],
})
export class PrequalificationModule {}
