import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';

@Injectable()
export class RepaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDealAccess(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true, name: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async list(organizationId: string, dealId: string) {
    await this.assertDealAccess(organizationId, dealId);
    return this.prisma.repayment.findMany({ where: { dealId }, orderBy: { date: 'desc' } });
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateRepaymentDto) {
    const deal = await this.assertDealAccess(organizationId, dealId);
    const repayment = await this.prisma.repayment.create({
      data: { dealId, createdById: userId, amount: dto.amount, date: new Date(dto.date), projected: dto.projected ?? false, note: dto.note },
    });
    const label = dto.projected ? 'Remboursement projeté ajouté' : 'Remboursement enregistré';
    await this.activities.log(dealId, userId, 'DEAL_UPDATED', `${label} : ${dto.amount.toLocaleString('fr-FR')} € (${deal.name})`);
    return repayment;
  }

  async remove(organizationId: string, dealId: string, repaymentId: string) {
    await this.assertDealAccess(organizationId, dealId);
    const repayment = await this.prisma.repayment.findFirst({ where: { id: repaymentId, dealId } });
    if (!repayment) throw new NotFoundException('Remboursement introuvable');
    await this.prisma.repayment.delete({ where: { id: repaymentId } });
  }

  /** Monthly actual vs. projected repayments for the organization, for one year. */
  async summary(organizationId: string, year: number) {
    const repayments = await this.prisma.repayment.findMany({
      where: { deal: { organizationId }, date: { gte: new Date(`${year}-01-01`), lt: new Date(`${year + 1}-01-01`) } },
      select: { amount: true, date: true, projected: true },
    });

    const monthly = Array.from({ length: 12 }, (_, i) => ({ month: i + 1, actual: 0, projected: 0 }));
    let totalActual = 0;
    let totalProjected = 0;

    for (const r of repayments) {
      const bucket = monthly[r.date.getMonth()];
      const amount = Number(r.amount);
      if (r.projected) {
        bucket.projected += amount;
        totalProjected += amount;
      } else {
        bucket.actual += amount;
        totalActual += amount;
      }
    }

    return { year, monthly, totalActual, totalProjected };
  }
}
