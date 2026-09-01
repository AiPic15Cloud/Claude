import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { SourceHealth } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

const DAY_MS = 24 * 60 * 60 * 1000;
/// Un connecteur sans historique significatif ne peut pas être jugé en
/// dégradation — sous ce seuil de volume hebdomadaire moyen, on ne se
/// prononce pas plutôt que de générer un faux positif sur une source neuve.
const MIN_WEEKLY_BASELINE = 5;
/// Chute à moins de 20 % de la moyenne historique = suspicion de
/// dégradation du parseur, même si le connecteur répond sans erreur HTTP
/// (spec ATLAS v2, C.3 — "Data Capture Reliability", distincte de la santé
/// technique).
const DROP_RATIO_THRESHOLD = 0.2;

export interface RecordOutcomeInput {
  success: boolean;
  /** Cas "réponse vide mais pas d'erreur" (ex. baromètre à 0 résultat) — distinct d'un échec technique. */
  degraded?: boolean;
  /** A produit au moins une donnée nouvelle/modifiée — sert à horodater lastChangeAt. */
  changed?: boolean;
}

/**
 * Source Registry (spec ATLAS v2, C.2/C.3) — un enregistrement par
 * connecteur, partagé par tous les tenants (la conformité/santé d'une
 * source externe est un fait sur la source, pas sur l'organisation qui la
 * consulte). Alimenté par intelligence-marche (ingestSource) et
 * intelligence-concurrentielle (syncFromBarometer) à chaque collecte.
 */
@Injectable()
export class SourceRegistryService {
  private readonly logger = new Logger(SourceRegistryService.name);

  constructor(private readonly prisma: PrismaService) {}

  async recordOutcome(key: string, outcome: RecordOutcomeInput): Promise<void> {
    const now = new Date();
    const health: SourceHealth = !outcome.success ? 'BROKEN' : outcome.degraded ? 'DEGRADED' : 'OPERATIONAL';
    await this.prisma.sourceRegistryEntry.updateMany({
      where: { key },
      data: {
        lastCheckedAt: now,
        lastSuccessAt: outcome.success ? now : undefined,
        health,
        lastChangeAt: outcome.changed ? now : undefined,
      },
    });
  }

  async getCoverage() {
    const sources = await this.prisma.sourceRegistryEntry.findMany({ orderBy: { label: 'asc' } });
    return {
      sources,
      summary: {
        total: sources.length,
        operational: sources.filter((s) => s.health === 'OPERATIONAL').length,
        degraded: sources.filter((s) => s.health === 'DEGRADED').length,
        broken: sources.filter((s) => s.health === 'BROKEN').length,
      },
    };
  }

  /**
   * Surveille la santé de la donnée elle-même, pas seulement la santé HTTP
   * (spec C.3, "Data Capture Reliability") : un connecteur google-news-rss
   * qui répond 200 mais ne rapporte plus rien depuis 7 jours a un problème
   * tout aussi réel qu'un connecteur qui plante — juste invisible côté
   * technique. Ne couvre que les connecteurs automatiques (`manual` exclu :
   * un humain ne "dégrade" pas techniquement).
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDataCaptureReliability(): Promise<void> {
    const now = new Date();
    const sources = await this.prisma.newsSource.findMany({
      where: { connector: { not: 'manual' } },
      select: { id: true, connector: true },
    });
    const connectorToSourceIds = new Map<string, string[]>();
    for (const s of sources) {
      const list = connectorToSourceIds.get(s.connector) ?? [];
      list.push(s.id);
      connectorToSourceIds.set(s.connector, list);
    }

    for (const [connector, sourceIds] of connectorToSourceIds) {
      const currentWeekCount = await this.prisma.article.count({
        where: { sourceId: { in: sourceIds }, createdAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      });
      const priorFourWeeksCount = await this.prisma.article.count({
        where: {
          sourceId: { in: sourceIds },
          createdAt: { gte: new Date(now.getTime() - 35 * DAY_MS), lt: new Date(now.getTime() - 7 * DAY_MS) },
        },
      });
      const weeklyBaseline = priorFourWeeksCount / 4;

      if (weeklyBaseline < MIN_WEEKLY_BASELINE) continue; // pas assez d'historique pour juger
      if (currentWeekCount < weeklyBaseline * DROP_RATIO_THRESHOLD) {
        await this.recordOutcome(connector, { success: true, degraded: true });
        this.logger.warn(
          `Connecteur "${connector}" : ${currentWeekCount} article(s) cette semaine vs ${weeklyBaseline.toFixed(1)}/semaine en moyenne — suspicion de dégradation du parseur.`,
        );
      }
    }
  }
}
