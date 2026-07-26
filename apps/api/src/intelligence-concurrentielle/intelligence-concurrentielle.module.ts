import { Module } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { GraphModule } from '../graph/graph.module';
import { BarometerConnector } from './connectors/barometer.connector';
import { PlatformsSyncService } from './platforms-sync.service';

@Module({
  imports: [GraphModule],
  controllers: [PlatformsController],
  providers: [BarometerConnector, PlatformsSyncService],
})
export class IntelligenceConcurrentielleModule {}
