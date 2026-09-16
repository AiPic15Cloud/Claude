import { Logger, OnModuleInit } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { ProjectObservationService } from './project-observation.service';
import { PlatformRegistryService } from './platform-registry.service';
import { DETECTION_QUEUE } from './crowdfunding-watch.constants';

/**
 * Consommateur de la file de détection (spec Lot 1 §7) — chargé UNIQUEMENT
 * par le worker Railway (CrowdfundingWatchProcessorsModule, jamais importé
 * par AppModule) : le processus web ne doit jamais se mettre à consommer de
 * jobs, sous peine d'annuler la séparation détection/enrichissement/
 * notification demandée par la spec.
 *
 * Trois types de job, tous idempotents par jobId :
 * - `sync-platform` (répétable, un par plateforme, fréquence propre à
 *   chacune) : un cycle de détection.
 * - `reconcile-registry` (répétable, 60s) : répercute les changements du
 *   registre en base dans les jobs répétables `sync-platform` — c'est ce
 *   qui permet d'ajouter une plateforme sans redéploiement.
 * - `sweep-pending` (répétable, 60s) : republie les événements/observations
 *   non traités après un redémarrage ou une exécution concurrente, sans
 *   jamais créer de doublon (mêmes jobId qu'à l'origine).
 */
@Processor(DETECTION_QUEUE)
export class DetectionProcessor extends WorkerHost implements OnModuleInit {
  private readonly logger = new Logger(DetectionProcessor.name);

  constructor(
    private readonly projectObservation: ProjectObservationService,
    private readonly platformRegistry: PlatformRegistryService,
  ) {
    super();
  }

  async onModuleInit(): Promise<void> {
    await this.platformRegistry.ensureInternalJobs();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'sync-platform':
        return this.projectObservation.runDetectionCycle(job.data.sourceKey);
      case 'reconcile-registry':
        return this.platformRegistry.reconcileSchedules();
      case 'sweep-pending':
        return this.projectObservation.sweepPending();
      default:
        this.logger.warn(`Job de détection inconnu ignoré : "${job.name}"`);
    }
  }
}
