import { Injectable, NotFoundException } from '@nestjs/common';
import { Guarantee } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { isDealClosed } from '../common/deal-lifecycle.util';
import { UpsertGuaranteeDto } from './dto/upsert-guarantee.dto';
import { computeGuaranteeExpiry } from './guarantee-expiry.util';

function attachExpiry<T extends Guarantee>(guarantee: T, dealClosed: boolean) {
  return { ...guarantee, ...computeGuaranteeExpiry(guarantee.type, guarantee.endDate, new Date(), dealClosed) };
}

@Injectable()
export class GuaranteesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { repaid: true, stage: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async list(organizationId: string, dealId: string) {
    const deal = await this.assertDeal(organizationId, dealId);
    const guarantees = await this.prisma.guarantee.findMany({ where: { dealId }, orderBy: { rank: 'asc' } });
    return guarantees.map((g) => attachExpiry(g, isDealClosed(deal)));
  }

  async create(organizationId: string, dealId: string, userId: string, dto: UpsertGuaranteeDto) {
    const deal = await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.create({
      data: { dealId, ...dto, endDate: dto.endDate ? new Date(dto.endDate) : undefined },
    });
    await this.activities.log(
      dealId,
      userId,
      'GUARANTEE_ADDED',
      `Garantie ajoutée : ${guarantee.description} (${guarantee.type})`,
    );
    return attachExpiry(guarantee, isDealClosed(deal));
  }

  async update(organizationId: string, dealId: string, id: string, dto: Partial<UpsertGuaranteeDto>) {
    const deal = await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    const updated = await this.prisma.guarantee.update({
      where: { id },
      data: { ...dto, endDate: dto.endDate !== undefined ? (dto.endDate ? new Date(dto.endDate) : null) : undefined },
    });
    return attachExpiry(updated, isDealClosed(deal));
  }

  async remove(organizationId: string, dealId: string, id: string) {
    await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    await this.prisma.guarantee.delete({ where: { id } });
  }
}
