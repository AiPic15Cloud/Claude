import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { FeesController } from './fees.controller';
import { FeesService } from './fees.service';

@Module({
  imports: [PrismaModule],
  controllers: [FeesController],
  providers: [FeesService],
})
export class FeesModule {}
