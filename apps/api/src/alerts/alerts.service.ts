import { Injectable, NotFoundException } from '@nestjs/common';
import { AlertSeverity } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

@Injectable()
export class AlertsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string, unreadOnly = false) {
    return this.prisma.alert.findMany({
      where: { organizationId, ...(unreadOnly ? { read: false } : {}) },
      include: {
        deal: { select: { id: true, name: true, reference: true } },
        article: { select: { id: true, url: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  }

  create(
    organizationId: string,
    data: { title: string; message: string; severity?: AlertSeverity; dealId?: string; articleId?: string },
  ) {
    return this.prisma.alert.create({
      data: {
        organizationId,
        title: data.title,
        message: data.message,
        severity: data.severity,
        dealId: data.dealId,
        articleId: data.articleId,
      },
    });
  }

  async markRead(organizationId: string, id: string) {
    const alert = await this.prisma.alert.findFirst({ where: { id, organizationId } });
    if (!alert) throw new NotFoundException('Alerte introuvable');
    return this.prisma.alert.update({ where: { id }, data: { read: true } });
  }

  async markAllRead(organizationId: string) {
    await this.prisma.alert.updateMany({ where: { organizationId, read: false }, data: { read: true } });
  }

  countUnread(organizationId: string) {
    return this.prisma.alert.count({ where: { organizationId, read: false } });
  }
}
