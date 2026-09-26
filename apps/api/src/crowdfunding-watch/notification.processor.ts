import { Logger } from '@nestjs/common';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { NOTIFICATION_QUEUE } from './crowdfunding-watch.constants';

const NOTIFIABLE_EVENT_TYPES = new Set(['PROJECT_DETECTED', 'FUNDING_OPENED']);

/**
 * Consommateur de la file de notification (spec §2 + §6) — chargé
 * uniquement par le worker. Deux jobs :
 *
 * - `notify-event` : les deux événements distincts demandés par la spec
 *   ("Nouvelle collecte annoncée" / "Collecte ouverte") alimentent le flux
 *   global (lu directement depuis ProjectObservationEvent par le frontend,
 *   aucune Alert nécessaire) — une Alert org-scopée réelle (bell/push)
 *   n'est créée que lorsqu'un porteur Atlas est impliqué, pour éviter de
 *   notifier chaque organisation de tout mouvement de marché sans rapport
 *   avec son portefeuille.
 * - `notify-entity-match` : l'alerte complémentaire unique lorsqu'un
 *   rapprochement avec un porteur Atlas est confirmé (spec §6).
 *
 * Idempotence par colonne (`notifiedAt`), pas seulement par jobId BullMQ :
 * un jobId complété est retiré de la file (removeOnComplete), donc un
 * ré-enfilage par le sweep de reprise doit rester un no-op même si BullMQ
 * ne s'en souvient plus.
 */
@Processor(NOTIFICATION_QUEUE)
export class NotificationProcessor extends WorkerHost {
  private readonly logger = new Logger(NotificationProcessor.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case 'notify-event':
        return this.notifyEvent(job.data.eventId);
      case 'notify-entity-match':
        return this.notifyEntityMatch(job.data.linkId);
      default:
        this.logger.warn(`Job de notification inconnu ignoré : "${job.name}"`);
    }
  }

  private async notifyEvent(eventId: string): Promise<void> {
    const event = await this.prisma.projectObservationEvent.findUnique({ where: { id: eventId } });
    if (!event || event.notifiedAt) return; // déjà traité ou disparu — idempotent.

    // Événement du tout premier sync d'une plateforme — visible dans le flux, jamais notifié (spec §2 : "état initial").
    // Seuls PROJECT_DETECTED/FUNDING_OPENED sont des notifications au sens de la spec §2 ; les autres types
    // (PROJECT_UPDATED/FUNDING_CLOSED/PROJECT_REMOVED) restent visibles dans le flux sans déclencher d'alerte.
    if (!event.isBaseline && NOTIFIABLE_EVENT_TYPES.has(event.eventType)) {
      const label = event.eventType === 'FUNDING_OPENED' ? 'Collecte ouverte' : 'Nouvelle collecte annoncée';
      const suffix = event.discoveredAlreadyOpen ? ' (découverte directement ouverte — aucune annonce préalable n\'a été observée)' : '';
      // Rattachée à chaque organisation dont un porteur est déjà lié à cette observation (rapprochement confirmé avant même cette notification, cas rare mais possible si l'enrichissement d'un cycle précédent a été plus rapide) — le cas général (porteur détecté après coup) passe par notify-entity-match.
      const linkedOrgIds = await this.prisma.projectObservationEntityLink.findMany({
        where: { observation: { sourceKey: event.sourceKey, projectUrl: event.projectUrl }, status: 'CONFIRMED' },
        select: { organizationId: true },
        distinct: ['organizationId'],
      });
      for (const { organizationId } of linkedOrgIds) {
        // Idempotence par organisation, pas seulement par eventId global —
        // notifiedAt n'est marqué qu'une fois toute la boucle terminée
        // (ci-dessous), donc un retry BullMQ après échec partiel (ex. la
        // 3e organisation sur 5) doit pouvoir reprendre sans recréer les
        // Alert déjà insérées pour les organisations précédentes.
        const alreadyNotified = await this.prisma.alert.findFirst({
          where: { organizationId, projectObservationEventId: event.id },
        });
        if (alreadyNotified) continue;
        await this.alerts.create(organizationId, {
          title: label,
          message: `${event.projectName} (${event.sourceKey})${suffix}`,
          severity: 'WARNING',
          projectObservationEventId: event.id,
        });
      }
    }

    await this.prisma.projectObservationEvent.update({ where: { id: eventId }, data: { notifiedAt: new Date() } });
  }

  private async notifyEntityMatch(linkId: string): Promise<void> {
    const link = await this.prisma.projectObservationEntityLink.findUnique({
      where: { id: linkId },
      include: { observation: true, entity: { select: { name: true } } },
    });
    if (!link || link.notifiedAt) return; // déjà notifié ou disparu — idempotent (spec §6 : "une alerte complémentaire UNIQUE").

    await this.alerts.create(link.organizationId, {
      title: 'Porteur Atlas impliqué dans une collecte externe',
      message: `${link.entity.name} — ${link.observation.projectName} (${link.observation.sourceKey}). Rapprochement confirmé, à vérifier avant toute conclusion opérationnelle.`,
      severity: 'CRITICAL',
    });
    await this.prisma.projectObservationEntityLink.update({ where: { id: linkId }, data: { notifiedAt: new Date() } });
  }
}
