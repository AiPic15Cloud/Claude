import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FieldChangeService } from '../field-changes/field-change.service';
import { CreateSaleLotDto, UpdateSaleLotDto } from './dto/sale-lot.dto';

@Injectable()
export class SaleLotService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldChanges: FieldChangeService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  list(organizationId: string, dealId: string) {
    return this.prisma.saleLot.findMany({ where: { dealId, deal: { organizationId } }, orderBy: { sortOrder: 'asc' } });
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateSaleLotDto) {
    await this.assertDeal(organizationId, dealId);
    const lot = await this.prisma.saleLot.create({
      data: {
        dealId,
        label: dto.label,
        surfaceSqm: dto.surfaceSqm,
        salePrice: dto.salePrice,
        status: dto.status ?? 'OFFRE',
        sortOrder: dto.sortOrder ?? 0,
      },
    });
    await this.fieldChanges.recordDiff(organizationId, dealId, 'SaleLot', userId, [
      { key: `${lot.id}:salePrice`, label: `Lot "${lot.label}" — prix de vente`, oldValue: null, newValue: lot.salePrice },
    ]);
    return lot;
  }

  async update(organizationId: string, dealId: string, lotId: string, userId: string, dto: UpdateSaleLotDto) {
    await this.assertDeal(organizationId, dealId);
    const current = await this.prisma.saleLot.findFirst({ where: { id: lotId, dealId } });
    if (!current) throw new NotFoundException('Lot introuvable');

    const lot = await this.prisma.saleLot.update({
      where: { id: lotId },
      data: { label: dto.label, surfaceSqm: dto.surfaceSqm, salePrice: dto.salePrice, status: dto.status, sortOrder: dto.sortOrder },
    });

    await this.fieldChanges.recordDiff(organizationId, dealId, 'SaleLot', userId, [
      { key: `${lot.id}:salePrice`, label: `Lot "${lot.label}" — prix de vente`, oldValue: current.salePrice, newValue: lot.salePrice },
      { key: `${lot.id}:status`, label: `Lot "${lot.label}" — statut`, oldValue: current.status, newValue: lot.status },
    ]);
    return lot;
  }

  async remove(organizationId: string, dealId: string, lotId: string, userId: string) {
    await this.assertDeal(organizationId, dealId);
    const current = await this.prisma.saleLot.findFirst({ where: { id: lotId, dealId } });
    if (!current) throw new NotFoundException('Lot introuvable');

    await this.prisma.saleLot.delete({ where: { id: lotId } });

    await this.fieldChanges.recordDiff(organizationId, dealId, 'SaleLot', userId, [
      { key: `${current.id}:salePrice`, label: `Lot "${current.label}" — prix de vente (supprimé)`, oldValue: current.salePrice, newValue: null },
    ]);
  }
}
