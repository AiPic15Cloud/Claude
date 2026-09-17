import { Controller, Get, NotFoundException, Param, Post, Query, UseGuards } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { ProjectObservationStatus } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ProjectObservationService } from './project-observation.service';
import { PlatformRegistryService } from './platform-registry.service';
import { DETECTION_QUEUE } from './crowdfunding-watch.constants';

@ApiTags('crowdfunding-watch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crowdfunding-watch/observations')
export class ProjectObservationController {
  constructor(
    private readonly projectObservation: ProjectObservationService,
    private readonly platformRegistry: PlatformRegistryService,
    @InjectQueue(DETECTION_QUEUE) private readonly detectionQueue: Queue,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('sourceKey') sourceKey?: string, @Query('status') status?: ProjectObservationStatus) {
    return this.projectObservation.list(user.organizationId, { sourceKey, status });
  }

  @Get('events')
  listEvents() {
    return this.projectObservation.listEvents();
  }

  @Get(':id')
  async get(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const observation = await this.projectObservation.getById(id, user.organizationId);
    if (!observation) throw new NotFoundException('Observation introuvable');
    return observation;
  }

  /**
   * Synchronisation manuelle — enfile un cycle immédiat sur la file de
   * détection plutôt que d'exécuter le scraping directement dans le
   * processus web : le web ne doit jamais faire le travail du worker (spec
   * §7, séparation des responsabilités). Sans jobId, pour ne jamais entrer
   * en conflit avec le job répétable `detect:<sourceKey>` du worker.
   */
  @Post('sync')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  async triggerSync(@Query('sourceKey') sourceKey?: string) {
    const platforms = sourceKey ? [sourceKey] : (await this.platformRegistry.list()).map((p) => p.sourceKey);
    for (const key of platforms) {
      await this.detectionQueue.add('sync-platform', { sourceKey: key }, { removeOnComplete: true, removeOnFail: 50 });
    }
    return { queued: platforms.length };
  }
}
