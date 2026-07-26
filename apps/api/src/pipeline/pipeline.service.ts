import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreatePipelineEntryDto } from './dto/create-pipeline-entry.dto';
import { UpdatePipelineEntryDto } from './dto/update-pipeline-entry.dto';
import { QueryPipelineDto } from './dto/query-pipeline.dto';

@Injectable()
export class PipelineService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, userId: string, dto: CreatePipelineEntryDto) {
    return this.prisma.pipelineEntry.create({
      data: { ...dto, date: new Date(dto.date), organizationId, createdById: userId },
    });
  }

  async findAll(organizationId: string, query: QueryPipelineDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;
    const where = { organizationId, ...(query.committee ? { committee: query.committee } : {}) };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.pipelineEntry.findMany({ where, orderBy: { date: 'desc' }, skip: (page - 1) * pageSize, take: pageSize }),
      this.prisma.pipelineEntry.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async update(organizationId: string, id: string, dto: UpdatePipelineEntryDto) {
    await this.assertExists(organizationId, id);
    const { date, ...rest } = dto;
    return this.prisma.pipelineEntry.update({ where: { id }, data: { ...rest, date: date ? new Date(date) : undefined } });
  }

  async remove(organizationId: string, id: string) {
    await this.assertExists(organizationId, id);
    await this.prisma.pipelineEntry.delete({ where: { id } });
  }

  async summary(organizationId: string) {
    const entries = await this.prisma.pipelineEntry.findMany({
      where: { organizationId },
      select: { amount: true, committee: true, source: true, typology: true },
    });

    const totalAmount = entries.reduce((sum, e) => sum + Number(e.amount), 0);
    const validated = entries.filter((e) => e.committee === 'VALIDE');
    const toReview = entries.filter((e) => e.committee === 'PAS_DE_COMITE' || e.committee === 'CONDITIONS_SUSPENSIVES');
    const rejected = entries.filter((e) => e.committee === 'REFUSE');

    const bySource: Record<string, number> = {};
    for (const e of entries) {
      const key = e.source?.trim() || '—';
      bySource[key] = (bySource[key] ?? 0) + 1;
    }

    const byTypology: Record<string, { count: number; amount: number }> = {};
    for (const e of entries) {
      const key = e.typology?.trim() || '—';
      byTypology[key] = byTypology[key] ?? { count: 0, amount: 0 };
      byTypology[key].count += 1;
      byTypology[key].amount += Number(e.amount);
    }

    return {
      received: entries.length,
      totalAmount,
      validatedCount: validated.length,
      validatedRate: entries.length > 0 ? Math.round((validated.length / entries.length) * 1000) / 10 : 0,
      toReviewCount: toReview.length,
      rejectedCount: rejected.length,
      bySource: Object.entries(bySource)
        .map(([source, count]) => ({ source, count }))
        .sort((a, b) => b.count - a.count),
      byTypology: Object.entries(byTypology)
        .map(([typology, v]) => ({ typology, ...v }))
        .sort((a, b) => b.count - a.count),
    };
  }

  private async assertExists(organizationId: string, id: string) {
    const entry = await this.prisma.pipelineEntry.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!entry) throw new NotFoundException('Entrée pipeline introuvable');
  }
}
