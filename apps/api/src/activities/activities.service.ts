import { Injectable } from '@nestjs/common';
import { ActivityType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

  log(dealId: string, userId: string, type: ActivityType, message: string) {
    return this.prisma.activity.create({ data: { dealId, userId, type, message } });
  }

  listForDeal(dealId: string) {
    return this.prisma.activity.findMany({
      where: { dealId },
      include: { user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  listRecentForOrganization(organizationId: string, take = 20) {
    return this.prisma.activity.findMany({
      where: { deal: { organizationId } },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
        deal: { select: { id: true, name: true, reference: true } },
      },
      orderBy: { createdAt: 'desc' },
      take,
    });
  }
}
