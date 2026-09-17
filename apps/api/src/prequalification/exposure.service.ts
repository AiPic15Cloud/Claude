import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const num = (value: { toNumber(): number } | null | undefined): number | null => (value != null ? Number(value) : null);

export interface PrequalExposureDeal {
  dealId: string;
  dealName: string;
  dealReference: string;
  matchedOn: string;
  stage: string;
  status: string;
  amountRaised: number;
  interestRate: number | null;
  /** amountRaised − remboursements RÉALISÉS uniquement (jamais les remboursements projetés, spec §12 : "un remboursement prévu ne réduit l'exposition qu'après réalisation"). */
  outstandingCapital: number;
  /** Estimation simple (capital restant dû × taux annuel), jamais un calendrier d'intérêts réel — voir doctrine dans le commentaire du service. */
  expectedInterest: number | null;
  dateMax: string | null;
  recoveryStatus: string;
  isLate: boolean;
}

export interface PrequalExternalFinancing {
  entityName: string;
  platformName: string;
  projectName: string;
  amountTarget: number | null;
  status: string;
}

export interface PrequalExposureSummary {
  deals: PrequalExposureDeal[];
  totalOutstandingCapital: number;
  totalExpectedInterest: number;
  lateCount: number;
  /** Montant recherché par ce dossier de préqualification, tel que saisi dans le bilan financier — null si non renseigné. */
  amountRequested: number | null;
  /** totalOutstandingCapital + amountRequested — null si amountRequested est inconnu (jamais traité comme 0). */
  newExposureAfterFinancing: number | null;
  concentrationPct: number | null;
  externalFinancings: PrequalExternalFinancing[];
}

/**
 * Exposition et historique du porteur (spec §12). Réutilise les mécanismes
 * déjà en place plutôt que d'en construire de nouveaux :
 * - `Deal.porteurSiren` (déjà posé par DealsService/GraphService lors de la
 *   création d'un Deal) pour retrouver les autres opérations du même
 *   porteur — même logique que `autoLinkPromoteurBySiren`, pas de nouvelle
 *   table de lien.
 * - `ProjectObservationEntityLink` (module Veille crowdfunding, statut
 *   CONFIRMED uniquement) pour les "financements identifiés sur d'autres
 *   plateformes" — seulement si le porteur/société a été rapproché d'une
 *   `Entity` (spec §12, jamais une correspondance de nom seule).
 *
 * `expectedInterest` est une estimation simple (capital restant dû × taux
 * annuel), pas un calendrier d'échéances réel — ce dépôt n'a pas de
 * calendrier de flux d'intérêts par Deal en dehors du suivi mensuel
 * `InterestPayment` (qui constate, ne projette pas). Documenté comme tel,
 * jamais présenté comme un montant certain.
 */
@Injectable()
export class ExposureService {
  constructor(private readonly prisma: PrismaService) {}

  async getExposure(organizationId: string, caseId: string): Promise<PrequalExposureSummary> {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: { companies: true, people: true, financial: true },
    });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');

    const sirens = prequalCase.companies.map((c) => c.siren).filter((s): s is string => Boolean(s));
    const entityIds = [...prequalCase.people.map((p) => p.entityId), ...prequalCase.companies.map((c) => c.entityId)].filter(
      (id): id is string => Boolean(id),
    );

    const [deals, externalFinancings] = await Promise.all([
      sirens.length > 0
        ? this.prisma.deal.findMany({
            where: { organizationId, porteurSiren: { in: sirens }, id: { not: prequalCase.promotedDealId ?? undefined } },
            include: { repayments: { where: { projected: false } } },
          })
        : Promise.resolve([]),
      entityIds.length > 0
        ? this.prisma.projectObservationEntityLink.findMany({
            where: { organizationId, entityId: { in: entityIds }, status: 'CONFIRMED' },
            include: { observation: { include: { platform: true } }, entity: { select: { name: true } } },
          })
        : Promise.resolve([]),
    ]);

    const now = new Date();
    const exposureDeals: PrequalExposureDeal[] = deals.map((deal) => {
      const realizedRepaid = deal.repayments.reduce((sum, r) => sum + Number(r.amount), 0);
      const outstandingCapital = Math.max(0, Number(deal.amountRaised) - realizedRepaid);
      const interestRate = num(deal.interestRate);
      const dateMax = deal.dateMax;
      return {
        dealId: deal.id,
        dealName: deal.name,
        dealReference: deal.reference,
        matchedOn: `SIREN ${deal.porteurSiren}`,
        stage: deal.stage,
        status: deal.status,
        amountRaised: Number(deal.amountRaised),
        interestRate,
        outstandingCapital,
        expectedInterest: interestRate != null ? Math.round(outstandingCapital * (interestRate / 100) * 100) / 100 : null,
        dateMax: dateMax ? dateMax.toISOString() : null,
        recoveryStatus: deal.recoveryStatus,
        isLate: Boolean(dateMax && dateMax < now && deal.status === 'ACTIVE'),
      };
    });

    const totalOutstandingCapital = round2(exposureDeals.reduce((sum, d) => sum + d.outstandingCapital, 0));
    const totalExpectedInterest = round2(exposureDeals.reduce((sum, d) => sum + (d.expectedInterest ?? 0), 0));
    const amountRequested = num(prequalCase.financial?.amountRequested);
    const newExposureAfterFinancing = amountRequested != null ? round2(totalOutstandingCapital + amountRequested) : null;

    return {
      deals: exposureDeals,
      totalOutstandingCapital,
      totalExpectedInterest,
      lateCount: exposureDeals.filter((d) => d.isLate).length,
      amountRequested,
      newExposureAfterFinancing,
      concentrationPct:
        amountRequested != null && newExposureAfterFinancing != null && newExposureAfterFinancing > 0
          ? Math.round((amountRequested / newExposureAfterFinancing) * 1000) / 10
          : null,
      externalFinancings: externalFinancings.map((link) => ({
        entityName: link.entity.name,
        platformName: link.observation.platform.platformName,
        projectName: link.observation.projectName,
        amountTarget: num(link.observation.amountTarget),
        status: link.observation.status,
      })),
    };
  }
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
