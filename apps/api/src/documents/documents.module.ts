import { Module } from '@nestjs/common';
import { DocumentsService } from './documents.service';
import { DocumentsController, LocalDocumentsController } from './documents.controller';
import { ActivitiesModule } from '../activities/activities.module';
import { StorageModule } from '../common/storage/storage.module';

@Module({
  imports: [ActivitiesModule, StorageModule],
  providers: [DocumentsService],
  controllers: [DocumentsController, LocalDocumentsController],
  exports: [DocumentsService],
})
export class DocumentsModule {}
