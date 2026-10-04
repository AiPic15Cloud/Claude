import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import type { CrowdfundingConnectorStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DETECTION_QUEUE, RECONCILE_JOB_ID, SWEEP_JOB_ID, SWEEP_INTERVAL_MS, detectionJobId } from './crowdfunding-watch.constants';

export interface UpsertPlatformInput {
  sourceKey: string;
  label: string;
  platformName: string;
  listingUrl?: string;
  country?: string;
  accessMethod?: string;
  connectorStatus?: CrowdfundingConnectorStatus;
  authenticationRequiredForDocuments?: boolean;
  coverageNotes?: string;
  targetCheckFrequencySeconds?: number;
}

/**
 * Candidates déclarées à partir d'une reconnaissance manuelle du 4 octobre
 * 2026 (pilote externe "atlas-platform-collector", jamais exécuté par le
 * cycle de détection réel d'Atlas — seulement par un prototype indépendant).
 * `connectorStatus` reflète strictement ce qui a été vérifié ce jour-là :
 * aucune promotion vers OPERATIONAL n'est faite ici (spec §1/§2 — réservée à
 * un humain après un cycle réel réussi). Ajoutée une seule fois par
 * ensureKnownCandidatePlatforms() ci-dessous : ne touche jamais une ligne
 * déjà présente, pour ne jamais écraser un ajustement humain ultérieur via
 * l'API.
 *
 * Homunity et La Première Brique n'apparaissent PAS ici : elles sont déjà
 * dans le registre depuis la migration 20260916043945_crowdfunding_watch_lot1
 * ("pilot-homunity", "pilot-la-premiere-brique") — les y ajouter sous une
 * clé différente a produit un doublon visible en prod (corrigé par la
 * migration 20261004102858_crowdfunding_platform_dedupe_pilot, qui reporte
 * les constats du 04/10/2026 sur ces lignes canoniques). Baltis et Tantiem
 * sont réellement nouvelles.
 */
export const KNOWN_CANDIDATE_PLATFORMS: UpsertPlatformInput[] = [
  {
    sourceKey: 'baltis',
    label: 'Baltis',
    platformName: 'Baltis',
    listingUrl: 'https://app.baltis.com/projects',
    connectorStatus: 'PARTIAL',
    coverageNotes:
      "Reconnaissance du 04/10/2026 (prototype externe, hors cycle réel d'Atlas) : 18 cartes observées sur le catalogue public, 13 projets de dette immobilière retenus, 5 cartes exclues ou à qualifier, taux masqués conservés absents. L'extracteur générique d'Atlas (JSON-LD / RSC Next.js / __NEXT_DATA__) n'a encore jamais été exécuté contre cette source réelle — à confirmer au premier cycle de détection. La fiche de veille concurrentielle d'Atlas signale un pivot de marque vers « Puzzle » : vérifier que app.baltis.com reste le bon domaine avant d'interpréter un échec comme un blocage de code.",
  },
  {
    sourceKey: 'tantiem',
    label: 'Tantiem',
    platformName: 'Tantiem',
    connectorStatus: 'BLOCKED',
    coverageNotes:
      "Site public et modèle économique vérifiés (obligations indexées sur loyers nets) mais application reçue en HTTP 403 lors d'une reconnaissance le 04/10/2026. Catalogue détaillé non identifié — aucune URL de listing fiable à ce jour, à qualifier avant tout connecteur.",
  },
];

/**
 * Registre extensible des plateformes de crowdfunding (spec Lot 1 §1) — une
 * ligne en base suffit à déclarer une nouvelle plateforme ; reconcileSchedules
 * répercute automatiquement le résultat dans les jobs répétables BullMQ,
 * sans redéploiement (c'est le mécanisme concret de "ajout de plateforme
 * sans modification du cœur du système").
 */
@Injectable()
export class PlatformRegistryService {
  private readonly logger = new Logger(PlatformRegistryService.name);

  constructor(
    private readonly prisma: PrismaService,
    @InjectQueue(DETECTION_QUEUE) private readonly detectionQueue: Queue,
  ) {}

  list() {
    return this.prisma.crowdfundingPlatform.findMany({ include: { registryEntry: true }, orderBy: { label: 'asc' } });
  }

  async get(sourceKey: string) {
    const platform = await this.prisma.crowdfundingPlatform.findUnique({ where: { sourceKey }, include: { registryEntry: true } });
    if (!platform) throw new NotFoundException(`Plateforme introuvable : ${sourceKey}`);
    return platform;
  }

  /**
   * Un enregistrement TO_BUILD/BLOCKED sans connecteur écrit reste légitime
   * (spec §1) — jamais promu automatiquement vers OPERATIONAL ici : ce
   * champ n'est modifié que par un humain via update(), après vérification
   * réelle.
   */
  async create(input: UpsertPlatformInput) {
    await this.prisma.sourceRegistryEntry.upsert({
      where: { key: input.sourceKey },
      update: {},
      create: {
        key: input.sourceKey,
        label: input.label,
        accessMethod: input.accessMethod ?? 'scraping',
        approvalStatus: 'PENDING_REVIEW',
      },
    });
    const platform = await this.prisma.crowdfundingPlatform.create({
      data: {
        sourceKey: input.sourceKey,
        label: input.label,
        platformName: input.platformName,
        listingUrl: input.listingUrl,
        country: input.country ?? 'FR',
        accessMethod: input.accessMethod ?? 'scraping',
        connectorStatus: input.connectorStatus ?? 'TO_BUILD',
        authenticationRequiredForDocuments: input.authenticationRequiredForDocuments ?? false,
        coverageNotes: input.coverageNotes,
        targetCheckFrequencySeconds: input.targetCheckFrequencySeconds ?? 3600,
      },
    });
    await this.reconcileSchedules();
    return platform;
  }

  async update(sourceKey: string, input: Partial<UpsertPlatformInput>) {
    await this.get(sourceKey);
    const platform = await this.prisma.crowdfundingPlatform.update({
      where: { sourceKey },
      data: {
        label: input.label,
        platformName: input.platformName,
        listingUrl: input.listingUrl,
        country: input.country,
        accessMethod: input.accessMethod,
        connectorStatus: input.connectorStatus,
        authenticationRequiredForDocuments: input.authenticationRequiredForDocuments,
        coverageNotes: input.coverageNotes,
        targetCheckFrequencySeconds: input.targetCheckFrequencySeconds,
      },
    });
    await this.reconcileSchedules();
    return platform;
  }

  /**
   * Répercute l'état courant du registre dans les jobs répétables BullMQ —
   * appelé après toute modification côté API, et redondamment toutes les
   * 60s par le worker lui-même (job RECONCILE_JOB_ID) pour ne jamais
   * dépendre d'un seul chemin d'appel.
   */
  async reconcileSchedules(): Promise<void> {
    const platforms = await this.prisma.crowdfundingPlatform.findMany({ select: { sourceKey: true, targetCheckFrequencySeconds: true } });
    const repeatableJobs = await this.detectionQueue.getRepeatableJobs();
    const desired = new Map(platforms.map((p) => [detectionJobId(p.sourceKey), { everyMs: p.targetCheckFrequencySeconds * 1000, sourceKey: p.sourceKey }]));

    for (const job of repeatableJobs) {
      if (!job.id) continue;
      if (job.id === RECONCILE_JOB_ID || job.id === SWEEP_JOB_ID) continue;
      const desiredEntry = desired.get(job.id);
      if (desiredEntry === undefined) {
        // Plateforme retirée du registre — le job répétable ne doit pas survivre.
        await this.detectionQueue.removeRepeatableByKey(job.key);
        continue;
      }
      if (Number(job.every) !== desiredEntry.everyMs) {
        // Fréquence modifiée — retire l'ancien avant de recréer avec le nouvel intervalle.
        await this.detectionQueue.removeRepeatableByKey(job.key);
        desired.delete(job.id);
        await this.detectionQueue.add(
          'sync-platform',
          { sourceKey: desiredEntry.sourceKey },
          { jobId: job.id, repeat: { every: desiredEntry.everyMs }, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } },
        );
        continue;
      }
      desired.delete(job.id); // déjà en place et inchangé
    }

    // Ce qui reste dans `desired` n'a encore aucun job répétable — nouvelles plateformes.
    for (const [jobId, { everyMs, sourceKey }] of desired) {
      await this.detectionQueue.add('sync-platform', { sourceKey }, { jobId, repeat: { every: everyMs }, removeOnComplete: true, removeOnFail: 100, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    }
  }

  /** Enregistre les jobs répétables internes du worker (idempotent — un ajout avec le même jobId et le même intervalle est un no-op côté BullMQ). */
  async ensureInternalJobs(): Promise<void> {
    await this.ensureKnownCandidatePlatforms();
    await this.detectionQueue.add('reconcile-registry', {}, { jobId: RECONCILE_JOB_ID, repeat: { every: SWEEP_INTERVAL_MS }, removeOnComplete: true, removeOnFail: 20, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    await this.detectionQueue.add('sweep-pending', {}, { jobId: SWEEP_JOB_ID, repeat: { every: SWEEP_INTERVAL_MS }, removeOnComplete: true, removeOnFail: 20, attempts: 3, backoff: { type: 'exponential', delay: 5000 } });
    await this.reconcileSchedules();
    this.logger.log('Jobs internes du worker de veille crowdfunding enregistrés (reconciliation + sweep, 60s).');
  }

  /**
   * Déclare KNOWN_CANDIDATE_PLATFORMS si elles sont absentes du registre —
   * jamais de mise à jour sur une ligne déjà présente (un humain a pu
   * l'ajuster depuis via l'API). Appelé à chaque démarrage du worker : ne
   * dépend d'aucune exécution manuelle de script contre la base.
   */
  private async ensureKnownCandidatePlatforms(): Promise<void> {
    for (const candidate of KNOWN_CANDIDATE_PLATFORMS) {
      const existing = await this.prisma.crowdfundingPlatform.findUnique({ where: { sourceKey: candidate.sourceKey }, select: { sourceKey: true } });
      if (existing) continue;
      await this.create(candidate);
      this.logger.log(`Plateforme candidate déclarée dans le registre : "${candidate.sourceKey}" (${candidate.connectorStatus ?? 'TO_BUILD'}).`);
    }
  }
}
