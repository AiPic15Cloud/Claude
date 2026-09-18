import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DvfSearchService } from '../intelligence-marche/dvf-search.service';
import { computeMarketStudy, type PrequalMarketStudy } from './prequal-market-study.util';

const num = (value: { toNumber(): number } | null | undefined): number | null => (value != null ? Number(value) : null);

/**
 * Étude de marché automatisée (spec §10) — réutilise DvfSearchService
 * (déjà en production côté Intelligence Marché, geo-dvf/Etalab) plutôt que
 * de construire un nouveau connecteur DVF pour ce module.
 */
@Injectable()
export class MarketStudyService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dvfSearch: DvfSearchService,
  ) {}

  async getMarketStudy(organizationId: string, caseId: string): Promise<PrequalMarketStudy | null> {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: { project: true, financial: true },
    });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');

    const query = [prequalCase.project?.city, prequalCase.project?.postcode].filter(Boolean).join(' ');
    if (!query) return null;

    const [dvf, lots] = await Promise.all([
      this.dvfSearch.search(query),
      this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } }),
    ]);
    if (!dvf.commune) return null;

    const totalSurfaceSqm = lots.reduce((sum, lot) => sum + (num(lot.surfaceSqm) ?? 0), 0);

    return computeMarketStudy({
      source: 'DVF (Etalab/DGFiP)',
      commune: `${dvf.commune.name} (${dvf.commune.codeInsee})`,
      transactions: dvf.transactions.map((t) => ({ pricePerSqm: t.pricePerSqm, price: t.price, date: t.date })),
      prixSortiePondereParM2: num(prequalCase.financial?.prixSortiePondere),
      coutDeRevient: num(prequalCase.financial?.coutDeRevient),
      pointMortAuM2: num(prequalCase.financial?.pointMortAuM2),
      otherRevenueRetained: num(prequalCase.financial?.otherRevenueRetained),
      targetMarginPct: num(prequalCase.financial?.declaredMarginPct),
      totalSurfaceSqm,
      lotCount: lots.length,
    });
  }
}
