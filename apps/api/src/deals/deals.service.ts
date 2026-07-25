import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';

const DEAL_INCLUDE = {
  tags: { include: { tag: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { notes: true, documents: true, tasks: true } },
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly search: MeilisearchService,
  ) {}

  private indexForSearch(deal: { id: string; organizationId: string; name: string; reference: string; type: string; stage: string; city: string | null }) {
    void this.search.indexDeal({
      id: deal.id,
      organizationId: deal.organizationId,
      name: deal.name,
      reference: deal.reference,
      type: deal.type,
      stage: deal.stage,
      city: deal.city,
    });
  }

  private async generateReference(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const count = await this.prisma.deal.count({
      where: { organizationId, createdAt: { gte: new Date(`${year}-01-01`) } },
    });
    return `ATL-${year}-${String(count + 1).padStart(4, '0')}`;
  }

  async create(organizationId: string, userId: string, dto: CreateDealDto) {
    const reference = await this.generateReference(organizationId);
    const { tagIds, startDate, endDate, ...rest } = dto;

    const deal = await this.prisma.deal.create({
      data: {
        ...rest,
        reference,
        organizationId,
        createdById: userId,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
      },
      include: DEAL_INCLUDE,
    });

    await this.activities.log(deal.id, userId, 'DEAL_CREATED', `Opération créée : ${deal.name}`);
    this.indexForSearch(deal);
    return deal;
  }

  async findAll(organizationId: string, query: QueryDealsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.DealWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.stage?.length ? { stage: { in: query.stage } } : {}),
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.tagIds?.length ? { tags: { some: { tagId: { in: query.tagIds } } } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: DEAL_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deal.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        ...DEAL_INCLUDE,
        notes: {
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        tasks: { orderBy: { dueDate: 'asc' } },
        documents: true,
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateDealDto) {
    await this.assertExists(organizationId, id);
    const { tagIds, startDate, endDate, stage, ...rest } = dto;

    if (stage) {
      const current = await this.prisma.deal.findUnique({ where: { id }, select: { stage: true, name: true } });
      if (current && current.stage !== stage) {
        await this.activities.log(id, userId, 'STAGE_CHANGED', `Étape modifiée : ${current.stage} → ${stage}`);
      }
    }

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        ...rest,
        stage,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: DEAL_INCLUDE,
    });

    await this.activities.log(id, userId, 'DEAL_UPDATED', 'Opération mise à jour');
    this.indexForSearch(deal);
    return deal;
  }

  async changeStage(organizationId: string, id: string, userId: string, stage: Prisma.DealUpdateInput['stage']) {
    return this.update(organizationId, id, userId, { stage } as UpdateDealDto);
  }

  async setTags(organizationId: string, id: string, userId: string, tagIds: string[]) {
    await this.assertExists(organizationId, id);
    await this.prisma.dealTag.deleteMany({ where: { dealId: id } });
    if (tagIds.length) {
      await this.prisma.dealTag.createMany({ data: tagIds.map((tagId) => ({ dealId: id, tagId })) });
    }
    await this.activities.log(id, userId, 'TAG_ADDED', 'Tags mis à jour');
    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    await this.assertExists(organizationId, id);
    await this.prisma.deal.delete({ where: { id } });
    void this.search.removeDeal(id);
  }

  async kpis(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { amountTarget: true, amountRaised: true, stage: true, type: true, interestRate: true },
    });

    const totalAum = deals.reduce((sum, d) => sum + Number(d.amountTarget), 0);
    const totalRaised = deals.reduce((sum, d) => sum + Number(d.amountRaised), 0);
    const avgRate =
      deals.filter((d) => d.interestRate).reduce((sum, d) => sum + Number(d.interestRate), 0) /
      (deals.filter((d) => d.interestRate).length || 1);

    const byStage: Record<string, number> = {};
    for (const d of deals) byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;

    const byType: Record<string, number> = {};
    for (const d of deals) byType[d.type] = (byType[d.type] ?? 0) + 1;

    return {
      activeDeals: deals.length,
      totalAum,
      totalRaised,
      fundingProgress: totalAum > 0 ? Math.round((totalRaised / totalAum) * 100) : 0,
      averageInterestRate: Math.round(avgRate * 100) / 100,
      byStage,
      byType,
    };
  }

  private async assertExists(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }
}
