import { Module } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { GraphModule } from '../graph/graph.module';
import { SourceRegistryModule } from '../source-registry/source-registry.module';
import { BarometerConnector } from './connectors/barometer.connector';
import { PlatformsSyncService } from './platforms-sync.service';
import { CompetitorProjectsService } from './competitor-projects.service';

@Module({
  imports: [GraphModule, SourceRegistryModule],
  controllers: [PlatformsController],
  providers: [BarometerConnector, PlatformsSyncService, CompetitorProjectsService],
})
export class IntelligenceConcurrentielleModule {}
