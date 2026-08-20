import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class DataValidationService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Sign-off d'une seule personne (pas un maker-checker à deux) : atteste
   * que l'état actuel de cette entité, sur ce dossier, a été relu et
   * confirmé. Auto-invalidée dès qu'un nouveau FieldChange est enregistré
   * pour ce (dealId, entityType) — voir FieldChangeService.recordDiff().
   */
  async validate(organizationId: string, dealId: string, entityType: string, userId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');

    return this.prisma.dataValidation.upsert({
      where: { dealId_entityType: { dealId, entityType } },
      create: { organizationId, dealId, entityType, validatedById: userId },
      update: { validatedById: userId, validatedAt: new Date() },
      include: { validatedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }

  async invalidate(dealId: string, entityType: string) {
    await this.prisma.dataValidation.deleteMany({ where: { dealId, entityType } });
  }

  getStatus(organizationId: string, dealId: string) {
    return this.prisma.dataValidation.findMany({
      where: { dealId, organizationId },
      include: { validatedBy: { select: { id: true, firstName: true, lastName: true } } },
    });
  }
}
