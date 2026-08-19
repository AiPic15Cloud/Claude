import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';

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

interface SearchResult {
  siren?: string;
  nom_complet?: string;
  etat_administratif?: string;
}

interface SearchResponse {
  results?: SearchResult[];
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
  ) {}

  @Cron(CronExpression.EVERY_DAY_AT_8AM)
  async checkAll() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', repaid: false, porteurSiren: { not: null } },
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
      if (!status || status === deal.porteurMonitoringStatus) return { status, alerted: false };

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

      await this.prisma.deal.update({ where: { id: deal.id }, data: { porteurMonitoringStatus: status } });
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
    const [adminStatus, hasProcedureCollective] = await Promise.all([
      this.fetchAdminStatus(siren),
      this.fetchHasProcedureCollective(siren),
    ]);

    if (hasProcedureCollective) return 'procedure_collective';
    return adminStatus;
  }

  private async fetchAdminStatus(siren: string): Promise<'actif' | 'fermee' | null> {
    try {
      const url = `https://recherche-entreprises.api.gouv.fr/search?q=${encodeURIComponent(siren)}&per_page=1`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        this.logger.warn(`Recherche d'entreprises responded ${res.status} for SIREN ${siren}: ${preview.slice(0, 300)}`);
        return null;
      }
      const json = (await res.json()) as SearchResponse;
      const result = json.results?.find((r) => r.siren === siren) ?? json.results?.[0];
      if (!result) {
        this.logger.warn(`Recherche d'entreprises returned no result for SIREN ${siren}: ${JSON.stringify(json).slice(0, 300)}`);
        return null;
      }

      if (result.etat_administratif !== undefined && result.etat_administratif !== 'A') return 'fermee';
      if (result.etat_administratif === undefined) {
        this.logger.warn(`Recherche d'entreprises result for SIREN ${siren} has unexpected shape: ${JSON.stringify(result).slice(0, 300)}`);
        return null;
      }
      return 'actif';
    } catch (error) {
      this.logger.warn(`Recherche d'entreprises fetch failed for SIREN ${siren}: ${(error as Error).message}`);
      return null;
    }
  }

  /** BODACC — voir le commentaire de classe. familleavis === "collective" est confirmé par log réel. */
  private async fetchHasProcedureCollective(siren: string): Promise<boolean> {
    try {
      const url = `https://bodacc-datadila.opendatasoft.com/api/records/1.0/search/?dataset=annonces-commerciales&q=registre:${encodeURIComponent(siren)}&rows=20`;
      const res = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(10_000) });
      if (!res.ok) {
        const preview = await res.text().catch(() => '');
        this.logger.warn(`BODACC responded ${res.status} for SIREN ${siren}: ${preview.slice(0, 300)}`);
        return false;
      }
      const json = (await res.json()) as { records?: { fields?: { familleavis?: string } }[] };
      if (!Array.isArray(json.records)) {
        this.logger.warn(`BODACC unexpected shape for SIREN ${siren}: ${JSON.stringify(json).slice(0, 300)}`);
        return false;
      }
      return json.records.some((r) => r.fields?.familleavis === 'collective');
    } catch (error) {
      this.logger.warn(`BODACC fetch failed for SIREN ${siren}: ${(error as Error).message}`);
      return false;
    }
  }
}
