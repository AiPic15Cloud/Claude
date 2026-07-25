import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { UpsertGuaranteeDto } from './dto/upsert-guarantee.dto';

@Injectable()
export class GuaranteesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  list(organizationId: string, dealId: string) {
    return this.assertDeal(organizationId, dealId).then(() =>
      this.prisma.guarantee.findMany({ where: { dealId }, orderBy: { rank: 'asc' } }),
    );
  }

  async create(organizationId: string, dealId: string, userId: string, dto: UpsertGuaranteeDto) {
    await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.create({
      data: { dealId, ...dto },
    });
    await this.activities.log(
      dealId,
      userId,
      'GUARANTEE_ADDED',
      `Garantie ajoutée : ${guarantee.description} (${guarantee.type})`,
    );
    return guarantee;
  }

  async update(organizationId: string, dealId: string, id: string, dto: Partial<UpsertGuaranteeDto>) {
    await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    return this.prisma.guarantee.update({ where: { id }, data: dto });
  }

  async remove(organizationId: string, dealId: string, id: string) {
    await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    await this.prisma.guarantee.delete({ where: { id } });
  }
}
