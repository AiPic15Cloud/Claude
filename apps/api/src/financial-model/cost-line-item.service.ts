import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { FieldChangeService } from '../field-changes/field-change.service';
import { CreateCostLineItemDto, UpdateCostLineItemDto } from './dto/cost-line-item.dto';

@Injectable()
export class CostLineItemService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fieldChanges: FieldChangeService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  list(organizationId: string, dealId: string) {
    return this.prisma.costLineItem.findMany({ where: { dealId, deal: { organizationId } }, orderBy: { sortOrder: 'asc' } });
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateCostLineItemDto) {
    await this.assertDeal(organizationId, dealId);
    const item = await this.prisma.costLineItem.create({
      data: { dealId, category: dto.category, label: dto.label, amount: dto.amount, sortOrder: dto.sortOrder ?? 0 },
    });
    await this.fieldChanges.recordDiff(organizationId, dealId, 'CostLineItem', userId, [
      { key: item.id, label: `Poste "${item.label}"`, oldValue: null, newValue: item.amount },
    ]);
    return item;
  }

  async update(organizationId: string, dealId: string, itemId: string, userId: string, dto: UpdateCostLineItemDto) {
    await this.assertDeal(organizationId, dealId);
    const current = await this.prisma.costLineItem.findFirst({ where: { id: itemId, dealId } });
    if (!current) throw new NotFoundException('Poste introuvable');

    const item = await this.prisma.costLineItem.update({
      where: { id: itemId },
      data: { label: dto.label, amount: dto.amount, sortOrder: dto.sortOrder },
    });

    await this.fieldChanges.recordDiff(organizationId, dealId, 'CostLineItem', userId, [
      { key: item.id, label: `Poste "${item.label}"`, oldValue: current.amount, newValue: item.amount },
    ]);
    return item;
  }

  async remove(organizationId: string, dealId: string, itemId: string, userId: string) {
    await this.assertDeal(organizationId, dealId);
    const current = await this.prisma.costLineItem.findFirst({ where: { id: itemId, dealId } });
    if (!current) throw new NotFoundException('Poste introuvable');

    await this.prisma.costLineItem.delete({ where: { id: itemId } });

    await this.fieldChanges.recordDiff(organizationId, dealId, 'CostLineItem', userId, [
      { key: current.id, label: `Poste "${current.label}" (supprimé)`, oldValue: current.amount, newValue: null },
    ]);
  }
}
