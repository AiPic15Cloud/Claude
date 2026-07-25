import { Module } from '@nestjs/common';
import { PlatformsController } from './platforms.controller';
import { GraphModule } from '../graph/graph.module';

@Module({
  imports: [GraphModule],
  controllers: [PlatformsController],
})
export class IntelligenceConcurrentielleModule {}
