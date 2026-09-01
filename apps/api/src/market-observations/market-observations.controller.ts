import { Controller, Get, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ProjectObservationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { MarketObservationsService } from './market-observations.service';

@ApiTags('market-observations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market-observations')
export class MarketObservationsController {
  constructor(private readonly marketObservations: MarketObservationsService) {}

  @Get()
  list(@Query('sourceKey') sourceKey?: string, @Query('status') status?: ProjectObservationStatus) {
    return this.marketObservations.list({ sourceKey, status });
  }

  @Get('events')
  listEvents() {
    return this.marketObservations.listEvents();
  }

  @Post('sync')
  sync() {
    return this.marketObservations.syncAll();
  }
}
