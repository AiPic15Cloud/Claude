import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { MarketTickerController } from './market-ticker.controller';
import { MarketTickerService } from './market-ticker.service';

@Module({
  imports: [PrismaModule],
  controllers: [MarketTickerController],
  providers: [MarketTickerService],
})
export class MarketTickerModule {}
