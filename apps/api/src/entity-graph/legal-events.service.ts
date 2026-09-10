import { Injectable, Logger } from '@nestjs/common';
import type { LegalEventType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ContagionService } from './contagion.service';

/** Best-effort classification from BODACC `typeavis_lib` — never fabricated when no label matches, defaults to the broad "procédure collective" case. */
function classifyLegalEventType(labels: string[]): LegalEventType {
  const joined = labels.join(' ').toLowerCase();
  if (joined.includes('liquidation')) return 'LIQUIDATION_JUDICIAIRE';
  if (joined.includes('sauvegarde')) return 'SAUVEGARDE';
  return 'REDRESSEMENT_JUDICIAIRE';
}

/**
 * Journal d'événements juridiques par entité (spec Market Relationship &
 * Contagion Intelligence V2, §9) — jusqu'ici la détection BODACC
 * (CompanyMonitoringService) ne produisait qu'un Alert sur le dossier
 * concerné, sans trace structurée réutilisable pour l'évaluation de
 * contagion sur le reste du groupe économique.
 */
@Injectable()
export class LegalEventsService {
  private readonly logger = new Logger(LegalEventsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly contagion: ContagionService,
  ) {}

  async list(organizationId: string, entityId: string) {
    return this.prisma.legalEvent.findMany({ where: { organizationId, entityId }, orderBy: { detectedAt: 'desc' } });
  }

  /**
   * Un seul événement par (entité, type, source) — le déclencheur (le
   * changement de statut détecté par CompanyMonitoringService) est déjà
   * gardé côté appelant, cette déduplication est un filet de sécurité
   * supplémentaire, pas le seul mécanisme anti-spam.
   */
  async recordFromBodacc(
    organizationId: string,
    entityId: string,
    input: { siren: string; labels: string[]; reason: string },
  ) {
    const type = classifyLegalEventType(input.labels);
    const existing = await this.prisma.legalEvent.findFirst({
      where: { organizationId, entityId, type, source: 'BODACC' },
    });
    if (existing) return existing;

    const event = await this.prisma.legalEvent.create({
      data: {
        organizationId,
        entityId,
        type,
        source: 'BODACC',
        reference: input.siren,
        note: input.labels.length > 0 ? input.labels.join(', ') : undefined,
      },
    });

    await this.contagion
      .evaluateEntityEvent(organizationId, entityId, { legalEventId: event.id, reason: input.reason })
      .catch((err) => this.logger.error(`Échec de l'évaluation de contagion pour l'entité ${entityId}`, err instanceof Error ? err.stack : err));

    return event;
  }
}
