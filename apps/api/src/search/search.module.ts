import { Module } from '@nestjs/common';
import { MeilisearchService } from './meilisearch.service';
import { SearchController } from './search.controller';

@Module({
  providers: [MeilisearchService],
  controllers: [SearchController],
  exports: [MeilisearchService],
})
export class SearchModule {}
