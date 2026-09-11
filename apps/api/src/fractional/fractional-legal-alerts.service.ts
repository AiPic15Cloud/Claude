import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { computeLeaseLegalReview } from './lease-legal-review.util';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

/**
 * Surface les recommandations juridiques par bail (lease-legal-review.util.ts,
 * jusqu'ici visibles seulement en ouvrant l'onglet Locatif d'un dossier)
 * comme de vraies notifications dans la cloche d'alertes — mirrors
 * DeadlineAlertsService/GuaranteeExpiryAlertsService (boot + check 6h,
 * dedupe par titre d'Alert). Seuls ALERT/CRITIQUE remontent : WATCH/INFO
 * restent des points de vigilance routiniers visibles dans le dossier, pas
 * des interruptions.
 */
@Injectable()
export class FractionalLegalAlertsService implements OnApplicationBootstrap {
  private readonly logger = new Logger(FractionalLegalAlertsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
  ) {}

  onApplicationBootstrap() {
    void this.checkAll();
    setInterval(() => void this.checkAll(), CHECK_INTERVAL_MS);
  }

  private async checkAll() {
    const projects = await this.prisma.fractionalProject.findMany({
      where: { status: { notIn: ['REFUSE', 'ABANDONNE'] } },
      select: {
        id: true,
        organizationId: true,
        name: true,
        reference: true,
        leases: true,
      },
    });

    const asOfDate = new Date();
    let created = 0;
    for (const project of projects) {
      for (const lease of project.leases) {
        try {
          const review = computeLeaseLegalReview(
            {
              dateEffet: lease.dateEffet,
              dateTerme: lease.dateTerme,
              breakDates: (lease.breakDates as string[] | null)?.map((d) => new Date(d)) ?? [],
              statutRenouvellement: lease.statutRenouvellement,
              procedureCollective: lease.procedureCollective,
              impayesNotes: lease.impayesNotes,
              depotGarantieMontant: lease.depotGarantieMontant !== null ? Number(lease.depotGarantieMontant) : null,
              loyerFacialAnnuel: Number(lease.loyerFacialAnnuel),
              restrictionsCessionSousLocation: lease.restrictionsCessionSousLocation,
              repartitionTravaux: lease.repartitionTravaux,
              sirenLocataire: lease.sirenLocataire,
            },
            asOfDate,
          );
          if (review.worstSeverity !== 'ALERT' && review.worstSeverity !== 'CRITIQUE') continue;

          const alertTitle = `Juridique — ${lease.tenantName} (${project.reference})`;
          const existingAlert = await this.prisma.alert.findFirst({
            where: { organizationId: project.organizationId, fractionalProjectId: project.id, title: alertTitle },
          });
          if (existingAlert) continue;

          await this.alerts.create(project.organizationId, {
            title: alertTitle,
            message: `${project.name} — ${review.recommendations.map((r) => r.message).join(' · ')}`,
            severity: review.worstSeverity === 'CRITIQUE' ? 'CRITICAL' : 'WARNING',
            fractionalProjectId: project.id,
          });
          created += 1;
        } catch (err) {
          this.logger.error(
            `Échec du traitement juridique pour le bail ${lease.id} (dossier ${project.id})`,
            err instanceof Error ? err.stack : err,
          );
        }
      }
    }
    if (created > 0) this.logger.log(`${created} nouvelle(s) alerte(s) juridique(s) Fractionné créée(s).`);
  }
}
