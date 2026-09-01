import { Module } from '@nestjs/common';
import { SourceRegistryService } from './source-registry.service';
import { SourceRegistryController } from './source-registry.controller';

@Module({
  providers: [SourceRegistryService],
  controllers: [SourceRegistryController],
  exports: [SourceRegistryService],
})
export class SourceRegistryModule {}
