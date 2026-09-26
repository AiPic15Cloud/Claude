import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { Prisma, ProjectObservationStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { SourceRegistryService } from '../source-registry/source-registry.service';
import { fetchPlatformListing } from './connectors/platform-connector';
import { mapSourceCategoryToAtlasSegment } from './crowdfunding-taxonomy.util';
import { decideObservationEvent } from './observation-event.util';
import type { RawProjectObservation } from './project-observation.types';
import { ENRICHMENT_QUEUE, NOTIFICATION_QUEUE, enrichmentJobId, notifyEventJobId } from './crowdfunding-watch.constants';

const DAY_MS = 24 * 60 * 60 * 1000;
const MIN_WEEKLY_BASELINE = 2;
const DROP_RATIO_THRESHOLD = 0.2;
/** Lissage exponentiel de l'intervalle mesuré — amortit le bruit d'un cycle isolé sans faire disparaître une dérive durable (spec §2, "fréquence effective"). */
const FREQUENCY_EWMA_ALPHA = 0.3;

interface ComparableObservation {
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
  publishedAt: string | null;
  announcedOpeningAt: string | null;
}

interface ApplyResult {
  changed: boolean;
  eventIds: string[];
  touchedObservationIds: string[];
}

/**
 * Détection et diff des observations de projet (évolution du pilote Market
 * Intelligence Engine, spec ATLAS v2 C.1-C.3 + spec Lot 1 §2-3). Le cycle
 * complet — verrouillage, diff, événements, enfilage enrichissement/
 * notification — vit ici ; il est déclenché par DetectionProcessor (job
 * BullMQ répétable par plateforme), jamais par un @Cron dans ce service.
 */
@Injectable()
export class ProjectObservationService {
  private readonly logger = new Logger(ProjectObservationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly sourceRegistry: SourceRegistryService,
    @InjectQueue(ENRICHMENT_QUEUE) private readonly enrichmentQueue: Queue,
    @InjectQueue(NOTIFICATION_QUEUE) private readonly notificationQueue: Queue,
  ) {}

  /** Un cycle de détection pour une plateforme — appelé par le job répétable `detect:<sourceKey>`. */
  async runDetectionCycle(sourceKey: string): Promise<void> {
    const platform = await this.prisma.crowdfundingPlatform.findUnique({ where: { sourceKey } });
    if (!platform) {
      this.logger.warn(`Plateforme "${sourceKey}" absente du registre — cycle ignoré (probablement retirée entre l'enfilage et l'exécution du job).`);
      return;
    }
    if (!platform.listingUrl) {
      this.logger.warn(`Plateforme "${sourceKey}" sans URL de listing configurée — cycle ignoré (registre "à développer").`);
      return;
    }

    const previousCheckedAt = (await this.prisma.sourceRegistryEntry.findUnique({ where: { key: sourceKey }, select: { lastCheckedAt: true } }))?.lastCheckedAt ?? null;

    const result = await fetchPlatformListing(sourceKey, platform.label, platform.listingUrl);
    if (!result.success) {
      await this.sourceRegistry.recordOutcome(sourceKey, { success: false });
      return;
    }
    if (result.observations.length === 0) {
      // Page accessible mais rien de reconnu — jamais interprété comme "tous les projets ont disparu" (spec §8).
      await this.sourceRegistry.recordOutcome(sourceKey, { success: true, degraded: true });
      return;
    }

    const outcome = await this.prisma.$transaction(async (tx) => {
      const [{ locked }] = await tx.$queryRaw<{ locked: boolean }[]>`SELECT pg_try_advisory_xact_lock(hashtext(${`crowdfunding-detect:${sourceKey}`})) AS locked`;
      if (!locked) return null; // un autre cycle est déjà en cours pour cette plateforme — jamais deux passes concurrentes (spec §7).

      const freshPlatform = await tx.crowdfundingPlatform.findUnique({ where: { sourceKey } });
      if (!freshPlatform) return null;
      const isBaseline = freshPlatform.baselineCompletedAt === null;

      const applied = await this.applyObservations(tx, sourceKey, result.observations, isBaseline);
      if (isBaseline) {
        await tx.crowdfundingPlatform.update({ where: { sourceKey }, data: { baselineCompletedAt: new Date() } });
      }
      return applied;
    });

    if (outcome === null) {
      this.logger.log(`Cycle ignoré pour "${sourceKey}" (verrou déjà tenu ou plateforme retirée pendant l'exécution).`);
      return;
    }

    await this.sourceRegistry.recordOutcome(sourceKey, { success: true, changed: outcome.changed });
    await this.updateEffectiveFrequency(sourceKey, previousCheckedAt);

    for (const eventId of outcome.eventIds) {
      await this.notificationQueue.add('notify-event', { eventId }, { jobId: notifyEventJobId(eventId), removeOnComplete: true, removeOnFail: 200, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }
    for (const observationId of outcome.touchedObservationIds) {
      await this.enrichmentQueue.add('enrich-observation', { observationId }, { jobId: enrichmentJobId(observationId), removeOnComplete: true, removeOnFail: 200, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }
  }

  private toComparable(source: {
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
    publishedAt: Date | null;
    announcedOpeningAt: Date | null;
  }): ComparableObservation {
    return {
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
      publishedAt: source.publishedAt ? source.publishedAt.toISOString() : null,
      announcedOpeningAt: source.announcedOpeningAt ? source.announcedOpeningAt.toISOString() : null,
    };
  }

  private async applyObservations(tx: Prisma.TransactionClient, sourceKey: string, raw: RawProjectObservation[], isBaseline: boolean): Promise<ApplyResult> {
    let changed = false;
    const eventIds: string[] = [];
    const touchedObservationIds: string[] = [];
    const seenUrls: string[] = [];

    for (const obs of raw) {
      seenUrls.push(obs.projectUrl);
      const { atlasSegment, mappingConfidence } = mapSourceCategoryToAtlasSegment(obs.sourceCategory);
      const status = obs.status as ProjectObservationStatus;
      const newComparable = this.toComparable({
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
        publishedAt: obs.publishedAt,
        announcedOpeningAt: obs.announcedOpeningAt,
      });

      const existing = await tx.projectObservation.findUnique({
        where: { sourceKey_projectUrl: { sourceKey, projectUrl: obs.projectUrl } },
      });

      if (!existing) {
        const now = new Date();
        // Ouverte dès la première observation, sans PROJECT_DETECTED préalable — spec §2 : "découverte directement ouverte".
        const { eventType: creationEventType, discoveredAlreadyOpen } = decideObservationEvent(null, status, isBaseline);
        let created;
        try {
          created = await tx.projectObservation.create({
            data: {
              sourceKey,
              projectUrl: obs.projectUrl,
              ...newComparable,
              publishedAt: obs.publishedAt,
              announcedOpeningAt: obs.announcedOpeningAt,
              effectiveOpeningAt: status === 'EN_COLLECTE' ? now : null,
              firstDetectedAt: now,
              lastCheckedAt: now,
              lastSuccessAt: now,
              isBaseline,
            },
          });
        } catch (error) {
          // Deux cycles concurrents (verrou avancé entre le findUnique et le create d'un autre process) — l'observation existe déjà, rien de plus à faire ici.
          if ((error as { code?: string })?.code === 'P2002') continue;
          throw error;
        }
        touchedObservationIds.push(created.id);
        const event = await tx.projectObservationEvent.create({
          data: {
            sourceKey,
            projectUrl: obs.projectUrl,
            projectName: obs.projectName,
            eventType: creationEventType,
            newStatus: status,
            isBaseline,
            discoveredAlreadyOpen,
          },
        });
        eventIds.push(event.id);
        changed = true;
        continue;
      }

      const now = new Date();
      touchedObservationIds.push(existing.id);
      const previousComparable = this.toComparable(existing);
      const unchanged = JSON.stringify(previousComparable) === JSON.stringify(newComparable);

      await tx.projectObservation.update({ where: { id: existing.id }, data: { lastCheckedAt: now, lastSuccessAt: now } });
      if (unchanged) continue;

      await tx.projectObservationSnapshot.create({ data: { observationId: existing.id, data: previousComparable as object } });

      // Ouverture effective posée uniquement au moment où le statut bascule explicitement vers EN_COLLECTE — jamais dérivée d'une comparaison de date programmée dépassée.
      const justOpened = previousComparable.status !== 'EN_COLLECTE' && status === 'EN_COLLECTE';
      await tx.projectObservation.update({
        where: { id: existing.id },
        data: {
          ...newComparable,
          publishedAt: obs.publishedAt,
          announcedOpeningAt: obs.announcedOpeningAt,
          effectiveOpeningAt: justOpened ? now : undefined,
          observedAt: now,
        },
      });
      changed = true;

      const { eventType } = decideObservationEvent(previousComparable.status, status, false);
      const event = await tx.projectObservationEvent.create({
        data: {
          sourceKey,
          projectUrl: obs.projectUrl,
          projectName: obs.projectName,
          eventType,
          previousStatus: previousComparable.status !== status ? previousComparable.status : undefined,
          newStatus: previousComparable.status !== status ? status : undefined,
        },
      });
      eventIds.push(event.id);
    }

    // RETIRE plutôt qu'une suppression définitive — jamais lors du sync de baseline (rien n'existait avant, donc rien ne peut avoir "disparu").
    if (!isBaseline) {
      const staleObservations = await tx.projectObservation.findMany({
        where: { sourceKey, projectUrl: { notIn: seenUrls }, status: { not: 'RETIRE' } },
        select: { id: true, projectUrl: true, projectName: true, status: true },
      });
      for (const stale of staleObservations) {
        const event = await tx.projectObservationEvent.create({
          data: { sourceKey, projectUrl: stale.projectUrl, projectName: stale.projectName, eventType: 'PROJECT_REMOVED', previousStatus: stale.status, newStatus: 'RETIRE' },
        });
        eventIds.push(event.id);
        await tx.projectObservation.update({ where: { id: stale.id }, data: { status: 'RETIRE' } });
        changed = true;
      }
    }

    return { changed, eventIds, touchedObservationIds };
  }

  private async updateEffectiveFrequency(sourceKey: string, previousCheckedAt: Date | null): Promise<void> {
    if (!previousCheckedAt) return; // premier cycle observé — pas encore d'intervalle à mesurer.
    const deltaSeconds = (Date.now() - previousCheckedAt.getTime()) / 1000;
    if (deltaSeconds <= 0) return;

    const platform = await this.prisma.crowdfundingPlatform.findUnique({ where: { sourceKey }, select: { effectiveCheckFrequencySeconds: true } });
    const previousAverage = platform?.effectiveCheckFrequencySeconds;
    const nextAverage = previousAverage == null ? deltaSeconds : FREQUENCY_EWMA_ALPHA * deltaSeconds + (1 - FREQUENCY_EWMA_ALPHA) * previousAverage;
    await this.prisma.crowdfundingPlatform.update({ where: { sourceKey }, data: { effectiveCheckFrequencySeconds: Math.round(nextAverage) } });
  }

  /**
   * RETIRE exclu par défaut (projets disparus du listing source, conservés
   * pour l'historique) — sauf demande explicite du statut RETIRE.
   * `organizationId` scope l'indicateur de rapprochement affiché : une
   * observation de marché est globale, mais le badge "porteur Atlas
   * impliqué" ne doit jamais refléter un rapprochement créé pour une autre
   * organisation.
   */
  list(organizationId: string, filters: { sourceKey?: string; status?: ProjectObservationStatus }) {
    return this.prisma.projectObservation.findMany({
      where: { sourceKey: filters.sourceKey, status: filters.status ?? { not: 'RETIRE' } },
      include: {
        platform: { select: { platformName: true, connectorStatus: true } },
        entityLinks: { where: { organizationId, status: { not: 'REJECTED' } }, select: { status: true, confidence: true } },
      },
      orderBy: [{ observedAt: 'desc' }],
    });
  }

  /** `organizationId` scope les rapprochements affichés — une observation de marché est globale, mais ses rapprochements d'entités sont propres à chaque tenant (jamais exposer les entités d'une autre organisation). */
  getById(id: string, organizationId: string) {
    return this.prisma.projectObservation.findUnique({
      where: { id },
      include: {
        platform: true,
        snapshots: { orderBy: { observedAt: 'desc' } },
        entityLinks: { where: { organizationId }, include: { entity: { select: { id: true, name: true, type: true } } } },
      },
    });
  }

  listEvents(limit = 50) {
    return this.prisma.projectObservationEvent.findMany({ orderBy: { occurredAt: 'desc' }, take: limit });
  }

  /**
   * Reprise après redémarrage/panne (spec §7-8) — republie les événements
   * non notifiés et les observations non enrichies avec le même jobId
   * qu'à l'origine : BullMQ ignore silencieusement un ajout dont le jobId
   * est déjà connu, donc ce sweep ne peut jamais produire de doublon, qu'il
   * s'agisse d'un job réellement perdu ou d'un job encore légitimement en
   * file.
   */
  async sweepPending(): Promise<void> {
    const pendingEvents = await this.prisma.projectObservationEvent.findMany({ where: { notifiedAt: null }, select: { id: true }, take: 500 });
    for (const event of pendingEvents) {
      await this.notificationQueue.add('notify-event', { eventId: event.id }, { jobId: notifyEventJobId(event.id), removeOnComplete: true, removeOnFail: 200, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }

    const pendingObservations = await this.prisma.projectObservation.findMany({ where: { enrichedAt: null }, select: { id: true }, take: 500 });
    for (const observation of pendingObservations) {
      await this.enrichmentQueue.add('enrich-observation', { observationId: observation.id }, { jobId: enrichmentJobId(observation.id), removeOnComplete: true, removeOnFail: 200, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }

    if (pendingEvents.length > 0 || pendingObservations.length > 0) {
      this.logger.log(`Sweep de reprise : ${pendingEvents.length} événement(s) et ${pendingObservations.length} observation(s) republiés.`);
    }
  }

  /**
   * Même logique que SourceRegistryService.checkDataCaptureReliability(),
   * dupliquée ici plutôt que de coupler le service partagé au modèle
   * ProjectObservation (spec C.3, "Data Capture Reliability").
   */
  @Cron(CronExpression.EVERY_DAY_AT_9AM)
  async checkDataCaptureReliability(): Promise<void> {
    const now = new Date();
    const platforms = await this.prisma.crowdfundingPlatform.findMany({ select: { sourceKey: true, label: true } });

    // Un count() par plateforme et par fenêtre (2×N requêtes) — remplacé par
    // un groupBy par fenêtre (2 requêtes au total, quel que soit le nombre
    // de plateformes).
    const [currentWeekGroups, priorFourWeeksGroups] = await Promise.all([
      this.prisma.projectObservationEvent.groupBy({
        by: ['sourceKey'],
        where: { eventType: 'PROJECT_DETECTED', occurredAt: { gte: new Date(now.getTime() - 7 * DAY_MS) } },
        _count: { _all: true },
      }),
      this.prisma.projectObservationEvent.groupBy({
        by: ['sourceKey'],
        where: {
          eventType: 'PROJECT_DETECTED',
          occurredAt: { gte: new Date(now.getTime() - 35 * DAY_MS), lt: new Date(now.getTime() - 7 * DAY_MS) },
        },
        _count: { _all: true },
      }),
    ]);
    const currentWeekCounts = new Map(currentWeekGroups.map((g) => [g.sourceKey, g._count._all]));
    const priorFourWeeksCounts = new Map(priorFourWeeksGroups.map((g) => [g.sourceKey, g._count._all]));

    for (const platform of platforms) {
      const currentWeekCount = currentWeekCounts.get(platform.sourceKey) ?? 0;
      const priorFourWeeksCount = priorFourWeeksCounts.get(platform.sourceKey) ?? 0;
      const weeklyBaseline = priorFourWeeksCount / 4;

      if (weeklyBaseline < MIN_WEEKLY_BASELINE) continue;
      if (currentWeekCount < weeklyBaseline * DROP_RATIO_THRESHOLD) {
        await this.sourceRegistry.recordOutcome(platform.sourceKey, { success: true, degraded: true });
        this.logger.warn(
          `${platform.label} : ${currentWeekCount} nouveau(x) projet(s) cette semaine vs ${weeklyBaseline.toFixed(1)}/semaine en moyenne — suspicion de dégradation du parseur.`,
        );
      }
    }
  }
}
