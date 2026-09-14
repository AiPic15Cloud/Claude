import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { computeInterestPaymentStatus } from '../deals/interest-payment.util';
import { CreateInterestPaymentDto } from './dto/create-interest-payment.dto';
import { UpdateInterestPaymentDto } from './dto/update-interest-payment.dto';

@Injectable()
export class InterestPaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDealAccess(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, name: true, repaymentMode: true, interestPaymentDay: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async list(organizationId: string, dealId: string) {
    await this.assertDealAccess(organizationId, dealId);
    return this.prisma.interestPayment.findMany({ where: { dealId }, orderBy: { paidDate: 'desc' } });
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateInterestPaymentDto) {
    const deal = await this.assertDealAccess(organizationId, dealId);
    const payment = await this.prisma.interestPayment.create({
      data: { dealId, createdById: userId, paidDate: new Date(dto.paidDate), amount: dto.amount, note: dto.note },
    });
    await this.activities.log(
      dealId,
      userId,
      'DEAL_UPDATED',
      `Paiement d'intérêts enregistré (${deal.name})${dto.amount ? ` : ${dto.amount.toLocaleString('fr-FR')} €` : ''}`,
    );
    return payment;
  }

  async update(organizationId: string, dealId: string, paymentId: string, dto: UpdateInterestPaymentDto) {
    await this.assertDealAccess(organizationId, dealId);
    const existing = await this.prisma.interestPayment.findFirst({ where: { id: paymentId, dealId } });
    if (!existing) throw new NotFoundException("Paiement d'intérêts introuvable");
    return this.prisma.interestPayment.update({
      where: { id: paymentId },
      data: { paidDate: dto.paidDate ? new Date(dto.paidDate) : undefined, amount: dto.amount, note: dto.note },
    });
  }

  async remove(organizationId: string, dealId: string, paymentId: string) {
    await this.assertDealAccess(organizationId, dealId);
    const payment = await this.prisma.interestPayment.findFirst({ where: { id: paymentId, dealId } });
    if (!payment) throw new NotFoundException("Paiement d'intérêts introuvable");
    await this.prisma.interestPayment.delete({ where: { id: paymentId } });
  }

  /** Statut live du cycle d'intérêts en cours — null si le dossier n'est pas en mode MENSUEL ou n'a pas de jour d'échéance renseigné. */
  async getStatus(organizationId: string, dealId: string) {
    const deal = await this.assertDealAccess(organizationId, dealId);
    if (deal.repaymentMode !== 'MENSUEL' || deal.interestPaymentDay === null) return null;
    const lastPayment = await this.prisma.interestPayment.findFirst({ where: { dealId }, orderBy: { paidDate: 'desc' }, select: { paidDate: true } });
    return computeInterestPaymentStatus(deal.interestPaymentDay, lastPayment?.paidDate ?? null, new Date());
  }
}
