import { Module } from '@nestjs/common';
import { PrismaModule } from '../common/prisma/prisma.module';
import { IntelligenceMarcheModule } from '../intelligence-marche/intelligence-marche.module';
import { MarketTickerController } from './market-ticker.controller';
import { MarketTickerService } from './market-ticker.service';

@Module({
  imports: [PrismaModule, IntelligenceMarcheModule],
  controllers: [MarketTickerController],
  providers: [MarketTickerService],
})
export class MarketTickerModule {}
