import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Guarantee } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { isDealClosed } from '../common/deal-lifecycle.util';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { UpsertGuaranteeDto } from './dto/upsert-guarantee.dto';
import { computeGuaranteeExpiry } from './guarantee-expiry.util';

function attachExpiry<T extends Guarantee>(guarantee: T, dealClosed: boolean) {
  return { ...guarantee, ...computeGuaranteeExpiry(guarantee.type, guarantee.endDate, new Date(), dealClosed) };
}

@Injectable()
export class GuaranteesService {
  private readonly logger = new Logger(GuaranteesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly riskEngine: RiskEngineService,
  ) {}

  private recomputeRisk(organizationId: string, dealId: string) {
    return this.riskEngine
      .recomputeAndPersist(organizationId, dealId)
      .catch((err) => this.logger.error(`Échec du recalcul de risque pour le deal ${dealId}`, err instanceof Error ? err.stack : err));
  }

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
    await this.recomputeRisk(organizationId, dealId);
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
    await this.recomputeRisk(organizationId, dealId);
    return attachExpiry(updated, isDealClosed(deal));
  }

  /** Spec ATLAS v2, A.5 — "statut de chaque sûreté vérifié dans les 30 derniers jours ?". Même pattern que CompanyMonitoringCard : un humain confirme, jamais déduit. */
  async markVerified(organizationId: string, dealId: string, id: string, userId: string) {
    const deal = await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    const updated = await this.prisma.guarantee.update({ where: { id }, data: { verifiedAt: new Date() } });
    await this.activities.log(dealId, userId, 'GUARANTEE_VERIFIED', `Garantie vérifiée : ${updated.description} (${updated.type})`);
    await this.recomputeRisk(organizationId, dealId);
    return attachExpiry(updated, isDealClosed(deal));
  }

  async remove(organizationId: string, dealId: string, id: string) {
    await this.assertDeal(organizationId, dealId);
    const guarantee = await this.prisma.guarantee.findFirst({ where: { id, dealId } });
    if (!guarantee) throw new NotFoundException('Garantie introuvable');
    await this.prisma.guarantee.delete({ where: { id } });
    await this.recomputeRisk(organizationId, dealId);
  }
}
