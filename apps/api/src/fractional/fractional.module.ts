import { Module } from '@nestjs/common';
import { FractionalProjectsController } from './fractional-projects.controller';
import { FractionalProjectsService } from './fractional-projects.service';

@Module({
  controllers: [FractionalProjectsController],
  providers: [FractionalProjectsService],
})
export class FractionalModule {}
