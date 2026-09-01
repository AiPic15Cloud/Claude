import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import type { CompetitorProjectEventType, ProjectObservationStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SourceRegistryService } from '../source-registry/source-registry.service';
import { PILOT_SOURCE_CONFIGS, type PilotSourceConfig } from './pilot-sources.config';
import { fetchPilotSource } from './pilot-connector';
import { mapSourceCategoryToAtlasSegment } from './market-observations-taxonomy.util';
import type { RawProjectObservation } from './project-observation.types';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Mêmes seuils que source-registry.service.ts (C.3, "Data Capture Reliability"), dupliqués ici plutôt que de coupler le service partagé à ce second modèle métier. */
const MIN_WEEKLY_BASELINE = 2;
const DROP_RATIO_THRESHOLD = 0.2;

interface ComparableObservation {
  platform: string;
  projectName: string;
  operatorRaw: string | null;
  amountTarget: number | null;
  ratePct: number | null;
  durationMonths: number | null;
  sourceCategory: string | null;
  atlasSegment: string | null;
  mappingConfidence: string | null;
  location: string | null;
  status: ProjectObservationStatus;
}

/**
 * Pilote Market Intelligence Engine (spec ATLAS v2, C.1-C.3) — collecte
 * automatisée d'observations de projet sur 5 sources pilotes, avec
 * historique (snapshot au changement, jamais d'écrasement silencieux) et
 * événements (PROJECT_DETECTED/FUNDING_OPENED/FUNDING_CLOSED/
 * PROJECT_REMOVED/PROJECT_UPDATED). Même pattern de diff que
 * PlatformsSyncService (intelligence-concurrentielle), appliqué ici à des
 * observations de projet plutôt qu'à des statistiques de plateforme.
 */
@Injectable()
export class MarketObservationsService {
  private readonly logger = new Logger(MarketObservationsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sourceRegistry: SourceRegistryService,
  ) {}

  async syncAll() {
    let totalObserved = 0;
    for (const config of PILOT_SOURCE_CONFIGS) {
      await this.ensureRegistryEntry(config);
      const result = await fetchPilotSource(config);

      if (!result.success) {
        await this.sourceRegistry.recordOutcome(config.key, { success: false });
        continue;
      }
      if (result.observations.length === 0) {
        // Page accessible mais rien de reconnu — jamais interprété comme "tous les projets ont disparu".
        await this.sourceRegistry.recordOutcome(config.key, { success: true, degraded: true });
        continue;
      }

      const changed = await this.applyObservations(config, result.observations);
      await this.sourceRegistry.recordOutcome(config.key, { success: true, changed });
      totalObserved += result.observations.length;
    }
    this.logger.log(`Synchronisation pilote terminée — ${totalObserved} observation(s) au total sur ${PILOT_SOURCE_CONFIGS.length} source(s).`);
    return { totalObserved, sources: PILOT_SOURCE_CONFIGS.length };
  }

  private async ensureRegistryEntry(config: PilotSourceConfig): Promise<void> {
    const existing = await this.prisma.sourceRegistryEntry.findUnique({ where: { key: config.key } });
    if (existing) return;
    // Autorisation déjà confirmée par l'utilisateur pour ces 5 sources avant construction du pilote.
    await this.prisma.sourceRegistryEntry.create({
      data: {
        key: config.key,
        label: config.label,
        accessMethod: 'scraping',
        termsReviewed: true,
        reviewedAt: new Date(),
        authenticationRequired: false,
        approvalStatus: 'APPROVED_FOR_COLLECTION',
      },
    });
  }

  private toComparable(source: {
    platform: string;
    projectName: string;
    operatorRaw: string | null;
    amountTarget: unknown;
    ratePct: unknown;
    durationMonths: number | null;
    sourceCategory: string | null;
    atlasSegment: string | null;
    mappingConfidence: string | null;
    location: string | null;
    status: ProjectObservationStatus;
  }): ComparableObservation {
    return {
      platform: source.platform,
      projectName: source.projectName,
      operatorRaw: source.operatorRaw,
      amountTarget: source.amountTarget !== null && source.amountTarget !== undefined ? Number(source.amountTarget) : null,
      ratePct: source.ratePct !== null && source.ratePct !== undefined ? Number(source.ratePct) : null,
      durationMonths: source.durationMonths,
      sourceCategory: source.sourceCategory,
      atlasSegment: source.atlasSegment,
      mappingConfidence: source.mappingConfidence,
      location: source.location,
      status: source.status,
    };
  }

  private async applyObservations(config: PilotSourceConfig, raw: RawProjectObservation[]): Promise<boolean> {
    let changed = false;
    const seenUrls: string[] = [];

    for (const obs of raw) {
      seenUrls.push(obs.projectUrl);
      const { atlasSegment, mappingConfidence } = mapSourceCategoryToAtlasSegment(obs.sourceCategory);
      const status = obs.status as ProjectObservationStatus;
      const newComparable = this.toComparable({
        platform: config.platform,
        projectName: obs.projectName,
        operatorRaw: obs.operatorRaw,
        amountTarget: obs.amountTarget,
        ratePct: obs.ratePct,
        durationMonths: obs.durationMonths,
        sourceCategory: obs.sourceCategory,
        atlasSegment,
        mappingConfidence,
        location: obs.location,
        status,
      });

      const existing = await this.prisma.projectObservation.findUnique({
        where: { sourceKey_projectUrl: { sourceKey: config.key, projectUrl: obs.projectUrl } },
      });

      if (!existing) {
        await this.prisma.projectObservation.create({
          data: { sourceKey: config.key, projectUrl: obs.projectUrl, ...newComparable },
        });
        await this.prisma.projectObservationEvent.create({
          data: { sourceKey: config.key, projectUrl: obs.projectUrl, projectName: obs.projectName, eventType: 'PROJECT_DETECTED', newStatus: status },
        });
        changed = true;
        continue;
      }

      const previousComparable = this.toComparable(existing);
      if (JSON.stringify(previousComparable) === JSON.stringify(newComparable)) continue;

      await this.prisma.projectObservationSnapshot.create({
        data: { observationId: existing.id, data: previousComparable as object },
      });
      await this.prisma.projectObservation.update({
        where: { id: existing.id },
        data: { ...newComparable, observedAt: new Date() },
      });
      changed = true;

      const eventType: CompetitorProjectEventType =
        previousComparable.status !== status
          ? previousComparable.status === 'A_VENIR' && status === 'EN_COLLECTE'
            ? 'FUNDING_OPENED'
            : previousComparable.status === 'EN_COLLECTE' && status === 'CLOTURE'
              ? 'FUNDING_CLOSED'
              : 'PROJECT_UPDATED'
          : 'PROJECT_UPDATED';
      await this.prisma.projectObservationEvent.create({
        data: {
          sourceKey: config.key,
          projectUrl: obs.projectUrl,
          projectName: obs.projectName,
          eventType,
          previousStatus: previousComparable.status !== status ? previousComparable.status : undefined,
          newStatus: previousComparable.status !== status ? status : undefined,
        },
      });
    }

    const staleObservations = await this.prisma.projectObservation.findMany({
      where: { sourceKey: config.key, projectUrl: { notIn: seenUrls } },
      select: { id: true, projectUrl: true, projectName: true, status: true },
    });
    for (const stale of staleObservations) {
      await this.prisma.projectObservationEvent.create({
        data: { sourceKey: config.key, projectUrl: stale.projectUrl, projectName: stale.projectName, eventType: 'PROJECT_REMOVED', previousStatus: stale.status },
      });
      await this.prisma.projectObservation.delete({ where: { id: stale.id } });
      changed = true;
    }

    return changed;
  }

  async list(filters: { sourceKey?: string; status?: ProjectObservationStatus }) {
    return this.prisma.projectObservation.findMany({
      where: { sourceKey: filters.sourceKey, status: filters.status },
      orderBy: [{ observedAt: 'desc' }],
    });
  }

  async listEvents(limit = 50) {
    return this.prisma.projectObservationEvent.findMany({
      orderBy: { occurredAt: 'desc' },
      take: limit,
    });
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledSync(): Promise<void> {
    await this.syncAll();
  }

  /**
   * Même logique que SourceRegistryService.checkDataCaptureReliability(),
   * dupliquée ici plutôt que de coupler le service partagé au modèle
   * ProjectObservation qu'il n'a pas à connaître (spec C.3, "Data Capture
   * Reliability" — un connecteur qui répond sans erreur mais ne rapporte
   * plus rien depuis plusieurs jours a un problème tout aussi réel qu'un
   * connecteur en panne technique).
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDataCaptureReliability(): Promise<void> {
    const now = new Date();
    for (const config of PILOT_SOURCE_CONFIGS) {
      const currentWeekCount = await this.prisma.projectObservationEvent.count({
        where: { sourceKey: config.key, eventType: 'PROJECT_DETECTED', occurredAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
      });
      const priorFourWeeksCount = await this.prisma.projectObservationEvent.count({
        where: {
          sourceKey: config.key,
          eventType: 'PROJECT_DETECTED',
          occurredAt: { gte: new Date(now.getTime() - 35 * DAY_MS), lt: new Date(now.getTime() - 7 * DAY_MS) },
        },
      });
      const weeklyBaseline = priorFourWeeksCount / 4;

      if (weeklyBaseline < MIN_WEEKLY_BASELINE) continue;
      if (currentWeekCount < weeklyBaseline * DROP_RATIO_THRESHOLD) {
        await this.sourceRegistry.recordOutcome(config.key, { success: true, degraded: true });
        this.logger.warn(
          `${config.label} : ${currentWeekCount} nouveau(x) projet(s) cette semaine vs ${weeklyBaseline.toFixed(1)}/semaine en moyenne — suspicion de dégradation du parseur.`,
        );
      }
    }
  }
}
