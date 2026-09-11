import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CreateRentIndexSeriesDto } from './dto/create-rent-index-series.dto';
import { CreateMarketComparableDto } from './dto/create-market-comparable.dto';

/**
 * Marché (patch V3.2 §2) — RentIndexSeries et MarketComparablePool sont des
 * tables PARTAGÉES au niveau organisation, jamais dupliquées par dossier :
 * un même indice ILC ou un même comparable géographique sert tous les
 * dossiers Fractionné de l'organisation. D'où un scope organizationId
 * plutôt que createdById, contrairement au reste du module Fractionné.
 */
@Injectable()
export class MarketDataService {
  constructor(private readonly prisma: PrismaService) {}

  listRentIndexSeries(user: AuthenticatedUser, indexType?: string) {
    return this.prisma.rentIndexSeries.findMany({
      where: { organizationId: user.organizationId, ...(indexType ? { indexType: indexType as never } : {}) },
      orderBy: [{ indexType: 'asc' }, { period: 'desc' }],
    });
  }

  async createRentIndexSeries(dto: CreateRentIndexSeriesDto, user: AuthenticatedUser) {
    return this.prisma.rentIndexSeries.upsert({
      where: { organizationId_indexType_period: { organizationId: user.organizationId, indexType: dto.indexType, period: dto.period } },
      create: {
        organizationId: user.organizationId,
        indexType: dto.indexType,
        period: dto.period,
        value: dto.value,
        cagr5y: dto.cagr5y ?? null,
        cagr10y: dto.cagr10y ?? null,
        asOfDate: new Date(dto.asOfDate),
        source: dto.source ?? null,
      },
      update: {
        value: dto.value,
        cagr5y: dto.cagr5y ?? null,
        cagr10y: dto.cagr10y ?? null,
        asOfDate: new Date(dto.asOfDate),
        source: dto.source ?? null,
      },
    });
  }

  async removeRentIndexSeries(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.rentIndexSeries.findUnique({ where: { id } });
    if (!row || row.organizationId !== user.organizationId) throw new NotFoundException('Série non trouvée');
    await this.prisma.rentIndexSeries.delete({ where: { id } });
  }

  listMarketComparables(user: AuthenticatedUser, commune?: string) {
    return this.prisma.marketComparablePool.findMany({
      where: { organizationId: user.organizationId, ...(commune ? { commune } : {}) },
      orderBy: { asOfDate: 'desc' },
    });
  }

  async createMarketComparable(dto: CreateMarketComparableDto, user: AuthenticatedUser) {
    return this.prisma.marketComparablePool.create({
      data: {
        organizationId: user.organizationId,
        commune: dto.commune,
        secteur: dto.secteur ?? null,
        type: dto.type,
        valeurM2: dto.valeurM2 ?? null,
        yieldPct: dto.yieldPct ?? null,
        surfaceM2: dto.surfaceM2 ?? null,
        asOfDate: new Date(dto.asOfDate),
        source: dto.source,
        addedByProjectId: dto.addedByProjectId ?? null,
        notes: dto.notes ?? null,
      },
    });
  }

  async removeMarketComparable(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.marketComparablePool.findUnique({ where: { id } });
    if (!row || row.organizationId !== user.organizationId) throw new NotFoundException('Comparable non trouvé');
    await this.prisma.marketComparablePool.delete({ where: { id } });
  }
}
