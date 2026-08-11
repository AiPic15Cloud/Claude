import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { BarometerConnector } from './connectors/barometer.connector';
import { COMPETITOR_WATCHLIST } from './competitor-watchlist';

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
      // The barometer publishes its own documented, rule-based quality score —
      // use it directly rather than approximating one from a subset of fields.
      const metadata = {
        source: 'barometre-crowdfunding.com',
        fetchedAt: new Date().toISOString(),
        category: stat.category ?? null,
        isTerminated: stat.isTerminated ?? null,
        totalFunded: stat.totalFunded ?? null,
        projectCountFinanced: stat.projectCountFinanced ?? null,
        capitalReimbursed: stat.capitalReimbursed ?? null,
        projectCountReimbursed: stat.projectCountReimbursed ?? null,
        riskAmount: stat.riskAmount ?? null,
        riskProjects: stat.riskProjects ?? null,
        capitalInDefault: stat.capitalInDefault ?? null,
        lastReportDate: stat.lastReportDate ?? null,
        averageLoanDuration: stat.averageLoanDuration ?? null,
        atlasScore: stat.qualityScore ?? null,
      };

      const existing = await this.prisma.graphEntity.findFirst({
        where: { organizationId, type: 'PLATEFORME', name: { equals: stat.name, mode: 'insensitive' } },
      });

      if (existing) {
        await this.prisma.graphEntity.update({
          where: { id: existing.id },
          data: { metadata: { ...(existing.metadata as object), ...metadata } },
        });
      } else {
        await this.prisma.graphEntity.create({
          data: { organizationId, type: 'PLATEFORME', name: stat.name, metadata },
        });
      }
      synced++;
    }

    this.logger.log(`Synced ${synced} competitor platform(s) from the barometer.`);
    return { synced, source: 'barometre-crowdfunding.com', fetchedAt: new Date().toISOString(), degraded: false };
  }

  // Applies the hand-researched competitive-watch list (see
  // competitor-watchlist.ts) — the same data the demo seed uses — to a real
  // organization's data. Unlike the barometer sync this isn't scheduled;
  // it's triggered on demand (the "Charger la liste de veille" button) so a
  // freshly-imported production org can pick up the list without needing a
  // full database reseed. Upsert by name, preserving any other metadata key
  // already on the entity (e.g. barometer stats), same merge pattern as
  // syncFromBarometer above.
  async applyWatchlist(organizationId: string) {
    let applied = 0;
    for (const entry of COMPETITOR_WATCHLIST) {
      const metadata = {
        businessModel: entry.category,
        country: entry.country ?? null,
        verificationStatus: entry.verificationStatus ?? null,
        verificationNote: entry.verificationNote ?? null,
        isTerminated: entry.verificationStatus === 'LIQUIDE',
      };

      const existing = await this.prisma.graphEntity.findFirst({
        where: { organizationId, type: 'PLATEFORME', name: { equals: entry.name, mode: 'insensitive' } },
      });

      if (existing) {
        await this.prisma.graphEntity.update({
          where: { id: existing.id },
          data: { metadata: { ...(existing.metadata as object), ...metadata } },
        });
      } else {
        await this.prisma.graphEntity.create({
          data: { organizationId, type: 'PLATEFORME', name: entry.name, website: entry.website, metadata },
        });
      }
      applied++;
    }

    this.logger.log(`Applied the competitive-watch list to ${applied} platform(s).`);
    return { applied };
  }
}
