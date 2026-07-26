import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BarometerConnector } from './connectors/barometer.connector';
import { computePlatformScore } from './platform-score.util';

@Injectable()
export class PlatformsSyncService {
  private readonly logger = new Logger(PlatformsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly barometer: BarometerConnector,
  ) {}

  async syncFromBarometer(organizationId: string) {
    const stats = await this.barometer.fetchCompetitorStats();
    if (stats.length === 0) {
      return { synced: 0, source: 'barometre-crowdfunding.com', fetchedAt: new Date().toISOString(), degraded: true };
    }

    let synced = 0;
    for (const stat of stats) {
      const score = computePlatformScore(stat);
      const metadata = {
        source: 'barometre-crowdfunding.com',
        fetchedAt: new Date().toISOString(),
        activeProjectsCount: stat.activeProjectsCount ?? null,
        cumulativeCollectedAmount: stat.cumulativeCollectedAmount ?? null,
        currentYearCollectedAmount: stat.currentYearCollectedAmount ?? null,
        cumulativeProjectsCount: stat.cumulativeProjectsCount ?? null,
        currentYearProjectsCount: stat.currentYearProjectsCount ?? null,
        lateRate: stat.lateRate ?? null,
        averageInterestRate: stat.averageInterestRate ?? null,
        atlasScore: score,
      };

      const existing = await this.prisma.graphEntity.findFirst({
        where: { organizationId, type: 'PLATEFORME', name: { equals: stat.name, mode: 'insensitive' } },
      });

      if (existing) {
        await this.prisma.graphEntity.update({
          where: { id: existing.id },
          data: {
            website: stat.website ?? existing.website,
            metadata: { ...(existing.metadata as object), ...metadata },
          },
        });
      } else {
        await this.prisma.graphEntity.create({
          data: { organizationId, type: 'PLATEFORME', name: stat.name, website: stat.website, metadata },
        });
      }
      synced++;
    }

    this.logger.log(`Synced ${synced} competitor platform(s) from the barometer.`);
    return { synced, source: 'barometre-crowdfunding.com', fetchedAt: new Date().toISOString(), degraded: false };
  }
}
