import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { PlaybooksService } from '../playbooks/playbooks.service';
import { fetchSirenAdminStatus, fetchSirenProcedureCollective } from '../common/siren/siren-resolver.util';
import { LegalEventsService } from '../entity-graph/legal-events.service';

type MonitoringStatus = 'actif' | 'procedure_collective' | 'fermee';

interface MonitoredDeal {
  id: string;
  organizationId: string;
  name: string;
  reference: string;
  porteurSiren: string | null;
  porteurSociete: string | null;
  porteurMonitoringStatus: string | null;
}

/**
 * Surveille le SIREN de la société de projet (porteur) de chaque dossier
 * actif. N'alerte qu'au changement de statut (comparé à
 * porteurMonitoringStatus stocké sur le deal), pas à chaque exécution —
 * sinon une procédure collective détectée une fois créerait une alerte par
 * jour indéfiniment.
 *
 * Deux sources, confirmées en production sur ~10 SIREN dont un cas réel de
 * procédure collective (SIREN 882115942, INVESTIBIEN) :
 * - fetchAdminStatus() interroge recherche-entreprises.api.gouv.fr pour
 *   etat_administratif : "fermee" quand ≠ 'A' est fiable. Cette API n'expose
 *   PAS de champ procedure_collective (une hypothèse initiale incorrecte,
 *   corrigée après confirmation par log plutôt que devinée deux fois —
 *   complements ne contient que des indicateurs sans rapport : qualité, RGE,
 *   ESS, etc.).
 * - fetchHasProcedureCollective() interroge BODACC (bulletin officiel des
 *   annonces civiles et commerciales, open data via
 *   bodacc-datadila.opendatasoft.com, dataset "annonces-commerciales") et
 *   cherche familleavis === "collective" — confirmé par log réel sur
 *   INVESTIBIEN (2 annonces "Procédures collectives", avril et juillet
 *   2026). Ne détecte pas la clôture d'une procédure (pas d'avis de clôture
 *   observé sur le cas test) : un statut 'procedure_collective' peut donc
 *   rester affiché après résolution, jusqu'à confirmation d'un cas réel de
 *   clôture.
 */
@Injectable()
export class CompanyMonitoringService {
  private readonly logger = new Logger(CompanyMonitoringService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly riskEngine: RiskEngineService,
    private readonly playbooks: PlaybooksService,
    private readonly legalEvents: LegalEventsService,
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkAll() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] }, porteurSiren: { not: null } },
      select: {
        id: true,
        organizationId: true,
        name: true,
        reference: true,
        porteurSiren: true,
        porteurSociete: true,
        porteurMonitoringStatus: true,
      },
    });

    let alerted = 0;
    for (const deal of deals) {
      const result = await this.checkDeal(deal);
      if (result.alerted) alerted += 1;
    }
    if (alerted > 0) this.logger.log(`${alerted} alerte(s) de surveillance société créée(s).`);
  }

  /** Déclenchement manuel (bouton "Vérifier maintenant") — même logique que le job quotidien, sur un seul dossier. */
  async checkOne(organizationId: string, dealId: string): Promise<{ status: MonitoringStatus | null; changed: boolean }> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, organizationId: true, name: true, reference: true, porteurSiren: true, porteurSociete: true, porteurMonitoringStatus: true },
    });
    if (!deal) throw new NotFoundException('Dossier introuvable');
    if (!deal.porteurSiren) throw new NotFoundException('Aucun SIREN renseigné pour ce dossier');

    const result = await this.checkDeal(deal);
    return { status: result.status, changed: result.alerted };
  }

  private async checkDeal(deal: MonitoredDeal): Promise<{ status: MonitoringStatus | null; alerted: boolean }> {
    if (!deal.porteurSiren) return { status: null, alerted: false };
    try {
      const status = await this.fetchStatus(deal.porteurSiren);
      if (!status) return { status, alerted: false };

      if (status === deal.porteurMonitoringStatus) {
        // Vérification réussie mais rien n'a changé — on trace quand même la
        // date de vérification (section 6 "Le Traçotin", fraîcheur des
        // données), sinon un dossier vérifié 50 fois de suite sans
        // changement ne laisserait aucune trace de la dernière vérification.
        await this.prisma.deal.update({ where: { id: deal.id }, data: { porteurCheckedAt: new Date() } });
        return { status, alerted: false };
      }

      let alerted = false;
      if (status === 'procedure_collective' || status === 'fermee') {
        const label = status === 'procedure_collective' ? 'Procédure collective détectée' : 'Société fermée/radiée';
        await this.alerts.create(deal.organizationId, {
          title: `${label} — ${deal.reference}`,
          message: `${deal.porteurSociete ?? deal.name} (SIREN ${deal.porteurSiren}) : ${label.toLowerCase()}. Vérification recommandée avant tout nouveau décaissement.`,
          severity: 'CRITICAL',
          dealId: deal.id,
        });
        alerted = true;
        if (status === 'procedure_collective') {
          await this.playbooks
            .triggerProcedureCollective(deal.organizationId, deal.id, 'surveillance_bodacc_auto')
            .catch((err) => this.logger.error(`Échec du déclenchement du playbook procédure collective pour le deal ${deal.id}`, err instanceof Error ? err.stack : err));
          await this.recordLegalEventAndEvaluateContagion(deal).catch((err) =>
            this.logger.error(`Échec de l'enregistrement de l'événement juridique pour le deal ${deal.id}`, err instanceof Error ? err.stack : err),
          );
        }
      } else if (deal.porteurMonitoringStatus === 'procedure_collective' || deal.porteurMonitoringStatus === 'fermee') {
        // Retour à un statut sain après une alerte précédente — vaut la peine d'être noté, sans réveiller le téléphone.
        await this.alerts.create(deal.organizationId, {
          title: `Statut redevenu actif — ${deal.reference}`,
          message: `${deal.porteurSociete ?? deal.name} (SIREN ${deal.porteurSiren}) : statut administratif redevenu actif.`,
          severity: 'WARNING',
          dealId: deal.id,
        });
        alerted = true;
      }

      await this.prisma.deal.update({ where: { id: deal.id }, data: { porteurMonitoringStatus: status, porteurCheckedAt: new Date() } });
      await this.riskEngine
        .recomputeAndPersist(deal.organizationId, deal.id)
        .catch((err) => this.logger.error(`Échec du recalcul de risque pour le deal ${deal.id}`, err instanceof Error ? err.stack : err));
      return { status, alerted };
    } catch (error) {
      this.logger.error(`Échec de la surveillance du SIREN ${deal.porteurSiren} (deal ${deal.id})`, error instanceof Error ? error.stack : error);
      return { status: null, alerted: false };
    }
  }

  private async fetchStatus(siren: string): Promise<MonitoringStatus | null> {
    const [adminStatus, procedureCollective] = await Promise.all([
      fetchSirenAdminStatus(siren),
      fetchSirenProcedureCollective(siren),
    ]);

    if (procedureCollective.hasProcedureCollective) return 'procedure_collective';
    return adminStatus;
  }

  /**
   * Journalise l'événement juridique (spec Market Relationship & Contagion
   * Intelligence V2, §9) et déclenche l'évaluation de contagion sur le
   * groupe économique du porteur — jusqu'ici la détection BODACC ne
   * produisait qu'un Alert, sans trace structurée ni propagation au-delà du
   * dossier concerné.
   */
  private async recordLegalEventAndEvaluateContagion(deal: MonitoredDeal): Promise<void> {
    if (!deal.porteurSiren) return;
    const link = await this.prisma.dealEntityLink.findFirst({ where: { dealId: deal.id, role: 'PROMOTEUR' }, select: { entityId: true } });
    if (!link) return;

    const { labels } = await fetchSirenProcedureCollective(deal.porteurSiren);
    await this.legalEvents.recordFromBodacc(deal.organizationId, link.entityId, {
      siren: deal.porteurSiren,
      labels,
      reason: `Surveillance quotidienne — ${deal.reference}`,
    });
  }
}
