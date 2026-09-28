import { Module } from '@nestjs/common';
import { DealDocumentRequestsService } from './deal-document-requests.service';
import { DealDocumentRequestsController } from './deal-document-requests.controller';

@Module({
  providers: [DealDocumentRequestsService],
  controllers: [DealDocumentRequestsController],
})
export class DealDocumentRequestsModule {}
