import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import type { FractionalProjectStatus } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActionItemsService } from '../action-items/action-items.service';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

// Un dossier tout juste saisi (Piste/Qualification) n'a normalement ni
// plateforme ni bail — ce n'est pas encore une anomalie actionnable, juste
// l'état attendu de son étape (spec §5.1 : le minimum requis dépend de
// l'étape). Les actions ci-dessous ne s'appliquent qu'à partir d'ANALYSE.
const STAGES_WITH_ACTIONABLE_GAPS: FractionalProjectStatus[] = ['ANALYSE', 'STRUCTURATION', 'VALIDATION_PLATEFORME', 'COLLECTE', 'ACQUISITION', 'EXPLOITATION'];

/**
 * Sweep périodique (même patron que FractionalLegalAlertsService : boot +
 * check 6h) qui matérialise en ActionItem les deux manques nommément cités
 * en exemple par la spec Cockpit/Fractionné P1 (§4.3) : absence de profil
 * plateforme et rent roll manquant. Résout automatiquement l'action dès
 * que la donnée correspondante apparaît (spec §4.2 : "un changement de
 * donnée résout ou réévalue automatiquement l'action").
 */
@Injectable()
export class FractionalActionItemsSweepService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FractionalActionItemsSweepService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly actionItems: ActionItemsService,
  ) {}

  onApplicationBootstrap() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), CHECK_INTERVAL_MS);
  }

  private async checkAll() {
    const projects = await this.prisma.fractionalProject.findMany({
      where: { status: { in: STAGES_WITH_ACTIONABLE_GAPS } },
      select: {
        id: true,
        name: true,
        reference: true,
        organizationId: true,
        createdById: true,
        vehicleStructure: { select: { platformProfileId: true } },
        _count: { select: { leases: true } },
      },
    });

    let touched = 0;
    for (const project of projects) {
      try {
        const scope = { organizationId: project.organizationId, fractionalProjectId: project.id };
        const hasPlatformProfile = Boolean(project.vehicleStructure?.platformProfileId);
        if (!hasPlatformProfile) {
          await this.actionItems.ensureOpen({
            organizationId: project.organizationId,
            fractionalProjectId: project.id,
            cause: 'NO_PLATFORM_PROFILE',
            actionType: 'CHOISIR_PLATEFORME',
            label: `${project.name} — fit plateforme non évaluable : aucun profil assigné`,
            ownerId: project.createdById,
            blocking: true,
            deepLink: `/fractional/${project.id}?tab=structure`,
          });
        } else {
          await this.actionItems.resolveByCause(scope, 'NO_PLATFORM_PROFILE', 'Profil plateforme renseigné.');
        }

        if (project._count.leases === 0) {
          await this.actionItems.ensureOpen({
            organizationId: project.organizationId,
            fractionalProjectId: project.id,
            cause: 'RENT_ROLL_MISSING',
            actionType: 'VERIFIER_DONNEE',
            label: `${project.name} — bail et conditions économiques à vérifier : aucun bail saisi`,
            ownerId: project.createdById,
            blocking: true,
            deepLink: `/fractional/${project.id}?tab=locatif`,
          });
        } else {
          await this.actionItems.resolveByCause(scope, 'RENT_ROLL_MISSING', 'Au moins un bail renseigné.');
        }
        touched += 1;
      } catch (err) {
        this.logger.error(`Échec du sweep action-items pour le dossier ${project.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (touched > 0) this.logger.log(`${touched} dossier(s) Fractionné évalué(s) pour la file d'actions.`);
  }
}
