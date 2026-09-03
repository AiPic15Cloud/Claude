import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { SourceRegistryService } from '../source-registry/source-registry.service';
import { BarometerConnector } from './connectors/barometer.connector';
import { COMPETITOR_WATCHLIST } from './competitor-watchlist';

const BAROMETER_SOURCE_KEY = 'barometer';

@Injectable()
export class PlatformsSyncService {
  private readonly logger = new Logger(PlatformsSyncService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly barometer: BarometerConnector,
    private readonly sourceRegistry: SourceRegistryService,
  ) {}

  async syncFromBarometer(organizationId: string) {
    let stats;
    try {
      stats = await this.barometer.fetchCompetitorStats();
    } catch (error) {
      this.logger.error(`Échec de collecte du baromètre: ${(error as Error).message}`);
      await this.sourceRegistry.recordOutcome(BAROMETER_SOURCE_KEY, { success: false });
      return { synced: 0, source: 'barometre-crowdfunding.com', fetchedAt: new Date().toISOString(), degraded: true };
    }
    if (stats.length === 0) {
      await this.sourceRegistry.recordOutcome(BAROMETER_SOURCE_KEY, { success: true, degraded: true });
      return { synced: 0, source: 'barometre-crowdfunding.com', fetchedAt: new Date().toISOString(), degraded: true };
    }

    let synced = 0;
    let changed = false;
    for (const stat of stats) {
      // The barometer publishes its own documented, rule-based quality score —
      // use it directly rather than approximating one from a subset of fields.
      // Stored as `externalScore` (never `atlasScore`, cf. principe 0.4 de la
      // spec ATLAS v2) : c'est un score tiers, jamais un score Atlas natif —
      // le nommage lui-même doit rendre la confusion impossible, pas
      // seulement l'affichage.
      const riskRatePct =
        stat.riskAmount != null && stat.totalFunded != null && stat.totalFunded > 0
          ? Math.round((stat.riskAmount / stat.totalFunded) * 1000) / 10
          : null;
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
        riskRatePct,
        riskProjects: stat.riskProjects ?? null,
        capitalInDefault: stat.capitalInDefault ?? null,
        lastReportDate: stat.lastReportDate ?? null,
        averageLoanDuration: stat.averageLoanDuration ?? null,
        externalScore: stat.qualityScore ?? null,
        dynamism: stat.dynamism ?? null,
      };

      const existing = await this.prisma.graphEntity.findFirst({
        where: { organizationId, type: 'PLATEFORME', name: { equals: stat.name, mode: 'insensitive' } },
      });

      // Snapshot avant l'écrasement (spec C.3 : "ne jamais écraser l'état
      // précédent") — seulement si le contenu utile a réellement changé,
      // pas à chaque tick horaire identique (fetchedAt seul ne compte pas).
      if (existing) {
        const { fetchedAt: _prevFetchedAt, ...previousComparable } = (existing.metadata as Record<string, unknown>) ?? {};
        const { fetchedAt: _newFetchedAt, ...newComparable } = metadata;
        if (JSON.stringify(previousComparable) !== JSON.stringify(newComparable)) {
          await this.prisma.platformStatsSnapshot.create({ data: { entityId: existing.id, metadata: existing.metadata as object } });
          changed = true;
        }
        await this.prisma.graphEntity.update({
          where: { id: existing.id },
          data: { metadata: { ...(existing.metadata as object), ...metadata } },
        });
      } else {
        await this.prisma.graphEntity.create({
          data: { organizationId, type: 'PLATEFORME', name: stat.name, metadata },
        });
        changed = true;
      }
      synced++;
    }

    await this.sourceRegistry.recordOutcome(BAROMETER_SOURCE_KEY, { success: true, changed });
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

  /**
   * Consommation événementielle du flux RSS/Atom (spec ATLAS v2, E.4) plutôt
   * qu'une interrogation périodique arbitraire : on ne resynchronise
   * réellement (fetchCompetitorStats, coûteux et déjà idempotent/diffé) que
   * lorsque le flux signale une nouvelle mise à jour depuis la dernière
   * observée. Le curseur est un horodatage (`lastRssItemAt`), pas un id
   * d'item — le format exact du flux n'a pas pu être vérifié depuis cet
   * environnement (accès direct bloqué), donc rien de plus spécifique n'est
   * supposé fiable. Toutes les organisations sont resynchronisées : la
   * donnée du baromètre est externe et identique pour tous les tenants,
   * seule sa matérialisation dans le Knowledge Graph est par organisation.
   *
   * Repli en cas d'indisponibilité du flux (priorisation NEXT de la spec
   * E) : la spec propose un "fallback HTML sur les pages /platforms/[nom]"
   * — mais contrairement à la page de listing (`/platforms`, dont le format
   * RSC a pu être confirmé sur une capture réelle, cf. barometer.connector.ts),
   * l'URL et la structure de ces pages individuelles n'ont jamais pu être
   * observées depuis cet environnement (accès direct bloqué) : les
   * construire à l'aveugle serait un pur pari, pas un fallback fiable.
   * Repli retenu à la place, qui répond au même besoin (ne pas laisser la
   * synchronisation dépendre indéfiniment d'un flux RSS en panne) sans
   * inventer de sélecteurs non vérifiés : si le flux ne répond rien
   * (indisponible ou vide) alors qu'aucune resynchronisation n'a réussi
   * depuis plus de RSS_FALLBACK_STALENESS_MS, on relance quand même
   * fetchCompetitorStats() (déjà vérifié, idempotent/diffé) via ce même
   * cron plutôt que d'attendre un clic manuel sur "Actualiser".
   */
  private static readonly RSS_FALLBACK_STALENESS_MS = 24 * 60 * 60_000;

  @Cron(CronExpression.EVERY_HOUR)
  async checkBarometerFeed(): Promise<void> {
    const items = await this.barometer.fetchFeedItems();
    const entry = await this.prisma.sourceRegistryEntry.findUnique({ where: { key: BAROMETER_SOURCE_KEY } });

    const newest = items.reduce<Date | null>((max, item) => (item.pubDate && (!max || item.pubDate > max) ? item.pubDate : max), null);
    const lastSeen = entry?.lastRssItemAt ?? null;
    const rssHasNewItem = newest !== null && (!lastSeen || newest > lastSeen);

    if (!rssHasNewItem) {
      const staleSince = entry?.lastSuccessAt ?? null;
      const isStale = !staleSince || Date.now() - staleSince.getTime() > PlatformsSyncService.RSS_FALLBACK_STALENESS_MS;
      if (items.length === 0 && isStale) {
        this.logger.warn('Barometer RSS indisponible ou vide et dernière synchronisation réussie trop ancienne — repli sur une resynchronisation directe.');
      } else {
        return;
      }
    } else {
      this.logger.log(`Barometer RSS: nouvelle mise à jour détectée (${newest!.toISOString()}) — resynchronisation.`);
    }

    const organizations = await this.prisma.organization.findMany({ select: { id: true } });
    for (const org of organizations) {
      await this.syncFromBarometer(org.id).catch((error) =>
        this.logger.error(`Échec de resynchronisation baromètre (org ${org.id}): ${(error as Error).message}`),
      );
    }

    if (newest) {
      await this.prisma.sourceRegistryEntry
        .updateMany({ where: { key: BAROMETER_SOURCE_KEY }, data: { lastRssItemAt: newest } })
        .catch(() => undefined);
    }
  }
}
