import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { TasksService } from '../tasks/tasks.service';
import { GeocodingService } from './geocoding.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { computeDeadlineAlert } from './deadline.util';
import { computeNewsletterStatus } from './newsletter.util';
import { buildMiseEnDemeure } from './mise-en-demeure.util';
import { computeCheckpointHealth } from './checkpoint-health.util';
import { withNoteImageUrls } from '../notes/note-image.util';
import { StorageService } from '../common/storage/storage.service';

// Fixed, never-translated title so the daily check can recognize its own
// previously-created reminder and never duplicate it — see
// createOverdueNewsletterTasks() below.
const NEWSLETTER_TASK_TITLE = 'Newsletter investisseurs à envoyer';

function computeFeesAmount(feesRate: number | null | undefined, amountRaised: number): number {
  if (!feesRate) return 0;
  return Math.round(((feesRate / 100) * amountRaised + Number.EPSILON) * 100) / 100;
}

const DEAL_INCLUDE = {
  tags: { include: { tag: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { notes: true, documents: true, tasks: true } },
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly search: MeilisearchService,
    private readonly geocoding: GeocodingService,
    private readonly tasks: TasksService,
    private readonly storage: StorageService,
  ) {}

  /** Only geocodes when the client didn't already supply coordinates and there's an address to resolve. */
  private async resolveCoordinates(
    lat: number | undefined,
    lng: number | undefined,
    location: { address?: string | null; city?: string | null; postcode?: string | null },
  ): Promise<{ lat?: number; lng?: number }> {
    if (lat !== undefined || lng !== undefined) return { lat, lng };
    if (!location.address && !location.city) return {};
    const result = await this.geocoding.geocode(location);
    return result ? { lat: result.lat, lng: result.lng } : {};
  }

  private toCheckpointHealth(
    checkpoint: {
      travauxBudgetInitial: Prisma.Decimal | null;
      travauxDepensesADate: Prisma.Decimal | null;
      prixVenteInitialPrevu: Prisma.Decimal | null;
      prixVenteReelADate: Prisma.Decimal | null;
      createdAt: Date;
    } | null,
  ) {
    return computeCheckpointHealth(
      checkpoint
        ? {
            travauxBudgetInitial: checkpoint.travauxBudgetInitial !== null ? Number(checkpoint.travauxBudgetInitial) : null,
            travauxDepensesADate: checkpoint.travauxDepensesADate !== null ? Number(checkpoint.travauxDepensesADate) : null,
            prixVenteInitialPrevu: checkpoint.prixVenteInitialPrevu !== null ? Number(checkpoint.prixVenteInitialPrevu) : null,
            prixVenteReelADate: checkpoint.prixVenteReelADate !== null ? Number(checkpoint.prixVenteReelADate) : null,
            createdAt: checkpoint.createdAt,
          }
        : null,
    );
  }

  /** Batch equivalent of toCheckpointHealth() for list endpoints — one query for the latest checkpoint of every deal in the page, instead of N+1. */
  private async attachCheckpointHealth<T extends { id: string }>(deals: T[]) {
    if (deals.length === 0) return deals as (T & { checkpointHealth: ReturnType<typeof computeCheckpointHealth> })[];
    const checkpoints = await this.prisma.projectCheckpoint.findMany({
      where: { dealId: { in: deals.map((d) => d.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByDeal = new Map<string, (typeof checkpoints)[number]>();
    for (const c of checkpoints) {
      if (!latestByDeal.has(c.dealId)) latestByDeal.set(c.dealId, c);
    }
    return deals.map((d) => ({ ...d, checkpointHealth: this.toCheckpointHealth(latestByDeal.get(d.id) ?? null) }));
  }

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

  // A prior read-then-increment scheme (compute "current max", add one) is
  // inherently racy: any two concurrent creates can read the same max
  // before either commits, then both retry from that same stale reading —
  // no amount of retrying escapes that, since a failed insert never
  // changes what "max" resolves to. A single atomic SQL upsert against a
  // per-(org, year) counter closes the race entirely, at any concurrency.
  //
  // The counter can still legitimately fall behind the deals table itself
  // (e.g. it was bootstrapped from a stale/partial max, or rows landed in
  // the table outside this path) — plain "+1 every call" can never recover
  // from that, it just walks forward one collision at a time. GREATEST(...)
  // makes every call self-healing: it re-checks the true max on every
  // invocation and jumps the counter past it if it's ever behind, not only
  // when the row is first created.
  private async nextReference(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ATL-${year}-`;

    const seedRow = await this.prisma.deal.findFirst({
      where: { organizationId, reference: { startsWith: prefix } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });
    const seed = seedRow ? parseInt(seedRow.reference.slice(prefix.length), 10) || 0 : 0;

    const rows = await this.prisma.$queryRaw<{ value: number }[]>`
      INSERT INTO reference_counters ("organizationId", "year", "value")
      VALUES (${organizationId}, ${year}, ${seed + 1})
      ON CONFLICT ("organizationId", "year")
      DO UPDATE SET "value" = GREATEST(reference_counters."value" + 1, ${seed + 1})
      RETURNING "value"
    `;
    const value = rows[0].value;
    this.logger.debug(`nextReference org=${organizationId} year=${year} seed=${seed} -> value=${value}`);
    return `${prefix}${String(value).padStart(4, '0')}`;
  }

  async create(organizationId: string, userId: string, dto: CreateDealDto) {
    const { tagIds, startDate, endDate, dateMin, dateCible, dateMax, lastNewsletterDate, feesRate, amountRaised, lat, lng, ...rest } = dto;
    const coords = await this.resolveCoordinates(lat, lng, { address: rest.address, city: rest.city, postcode: rest.postcode });
    const data = {
      ...rest,
      ...coords,
      amountRaised,
      feesRate,
      feesAmount: computeFeesAmount(feesRate, amountRaised ?? 0),
      organizationId,
      createdById: userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      dateMin: dateMin ? new Date(dateMin) : undefined,
      dateCible: dateCible ? new Date(dateCible) : undefined,
      dateMax: dateMax ? new Date(dateMax) : undefined,
      lastNewsletterDate: lastNewsletterDate ? new Date(lastNewsletterDate) : undefined,
      tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    };

    // Belt and braces: the counter is atomic so this shouldn't collide, but
    // if it's ever behind the actual max (e.g. rows inserted outside this
    // path), each retry pulls a fresh atomic increment — never the same
    // stale candidate twice — guaranteeing forward progress either way.
    let deal;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = await this.nextReference(organizationId);
      try {
        deal = await this.prisma.deal.create({ data: { ...data, reference }, include: DEAL_INCLUDE });
        break;
      } catch (error) {
        const isUniqueClash = (error as { code?: string })?.code === 'P2002';
        if (isUniqueClash) {
          const existing = await this.prisma.deal.findUnique({ where: { reference }, select: { id: true, name: true, createdAt: true } });
          this.logger.warn(
            `reference clash on attempt ${attempt} org=${organizationId} reference=${reference} existingDealId=${existing?.id} existingDealName=${existing?.name} existingCreatedAt=${existing?.createdAt?.toISOString()}`,
          );
        }
        if (!isUniqueClash || attempt === 4) throw error;
      }
    }

    await this.activities.log(deal!.id, userId, 'DEAL_CREATED', `Opération créée : ${deal!.name}`);
    this.indexForSearch(deal!);
    return { ...deal!, deadlineAlert: computeDeadlineAlert(deal!.dateMax, new Date(), deal!.repaid) };
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
      ...(query.late ? { dateMax: { lt: new Date() }, repaid: false } : {}),
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

    const withHealth = await this.attachCheckpointHealth(items);

    return {
      items: withHealth.map((d) => ({ ...d, deadlineAlert: computeDeadlineAlert(d.dateMax, new Date(), d.repaid) })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        ...DEAL_INCLUDE,
        notes: {
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, images: true },
          orderBy: { createdAt: 'desc' },
        },
        tasks: { orderBy: { dueDate: 'asc' } },
        documents: true,
        checkpoints: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    const checkpointHealth = this.toCheckpointHealth(deal.checkpoints[0] ?? null);
    const notes = await Promise.all(deal.notes.map((note) => withNoteImageUrls(note, this.storage)));
    return { ...deal, notes, deadlineAlert: computeDeadlineAlert(deal.dateMax, new Date(), deal.repaid), checkpointHealth };
  }

  async generateMiseEnDemeure(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: { organization: { select: { name: true } } },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    if (!deal.porteurNom || !deal.porteurAdresse) {
      throw new BadRequestException(
        "Coordonnées du porteur de projet manquantes — renseignez son nom et son adresse depuis \"Modifier\" avant de générer la mise en demeure.",
      );
    }

    return buildMiseEnDemeure({
      organizationName: deal.organization.name,
      dealName: deal.name,
      dealReference: deal.reference,
      porteurNom: deal.porteurNom,
      porteurSociete: deal.porteurSociete,
      porteurAdresse: deal.porteurAdresse,
      dateMax: deal.dateMax,
    });
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateDealDto) {
    await this.assertExists(organizationId, id);
    const { tagIds, startDate, endDate, dateMin, dateCible, dateMax, lastNewsletterDate, feesRate, amountRaised, stage, lat, lng, ...rest } = dto;

    const current = await this.prisma.deal.findUnique({
      where: { id },
      select: { stage: true, name: true, feesRate: true, amountRaised: true, dateMax: true, address: true, city: true, postcode: true, lat: true, lng: true },
    });

    let coords: { lat?: number; lng?: number } = { lat, lng };
    const addressChanged = rest.address !== undefined || rest.city !== undefined || rest.postcode !== undefined;
    const missingCoords = current ? current.lat === null && current.lng === null : false;
    if (lat === undefined && lng === undefined && (addressChanged || missingCoords)) {
      coords = await this.resolveCoordinates(undefined, undefined, {
        address: rest.address ?? current?.address,
        city: rest.city ?? current?.city,
        postcode: rest.postcode ?? current?.postcode,
      });
    }

    if (stage && current && current.stage !== stage) {
      await this.activities.log(id, userId, 'STAGE_CHANGED', `Étape modifiée : ${current.stage} → ${stage}`);
    }
    if (dateMax && current?.dateMax && new Date(dateMax).getTime() !== current.dateMax.getTime()) {
      await this.activities.log(
        id,
        userId,
        'DEAL_UPDATED',
        `Échéance prolongée : ${current.dateMax.toLocaleDateString('fr-FR')} → ${new Date(dateMax).toLocaleDateString('fr-FR')}`,
      );
    }

    const nextFeesRate = feesRate !== undefined ? feesRate : current ? Number(current.feesRate ?? 0) : 0;
    const nextAmountRaised = amountRaised !== undefined ? amountRaised : current ? Number(current.amountRaised) : 0;

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        ...rest,
        ...coords,
        amountRaised,
        feesRate,
        feesAmount: computeFeesAmount(nextFeesRate, nextAmountRaised),
        stage,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        dateMin: dateMin ? new Date(dateMin) : undefined,
        dateCible: dateCible ? new Date(dateCible) : undefined,
        dateMax: dateMax ? new Date(dateMax) : undefined,
        lastNewsletterDate: lastNewsletterDate ? new Date(lastNewsletterDate) : undefined,
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
    return { ...deal, deadlineAlert: computeDeadlineAlert(deal.dateMax, new Date(), deal.repaid) };
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
      select: { amountTarget: true, amountRaised: true, stage: true, type: true, interestRate: true, dateMax: true, repaid: true },
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

    const now = new Date();
    const lateDeals = deals.filter((d) => !d.repaid && d.dateMax && d.dateMax < now).length;

    return {
      activeDeals: deals.length,
      totalAum,
      totalRaised,
      fundingProgress: totalAum > 0 ? Math.round((totalRaised / totalAum) * 100) : 0,
      averageInterestRate: Math.round(avgRate * 100) / 100,
      lateDeals,
      byStage,
      byType,
    };
  }

  async newsletterSummary(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: { id: true, name: true, reference: true, lastNewsletterDate: true, newsletterTargetDays: true },
    });

    return deals
      .map((d) => ({ ...d, ...computeNewsletterStatus(d.lastNewsletterDate, d.newsletterTargetDays) }))
      .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
  }

  async pingNewsletter(organizationId: string, id: string, userId: string) {
    await this.assertExists(organizationId, id);
    const deal = await this.prisma.deal.update({ where: { id }, data: { lastNewsletterDate: new Date() } });
    await this.activities.log(id, userId, 'DEAL_UPDATED', 'Newsletter investisseurs envoyée');
    // Sending the NL resolves whatever reminder task the daily check may
    // have created — closing the loop instead of leaving a stale task.
    await this.prisma.task.updateMany({
      where: { dealId: id, title: NEWSLETTER_TASK_TITLE, done: false },
      data: { done: true, completedAt: new Date() },
    });
    return { ...deal, ...computeNewsletterStatus(deal.lastNewsletterDate, deal.newsletterTargetDays) };
  }

  private async assertExists(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  /**
   * Turns the newsletter cadence from a passive status badge into an
   * actual assigned task once a deal is overdue against its own
   * newsletterTargetDays (45 by default), counted from lastNewsletterDate.
   * Runs once a day across every org — idempotent (skips a deal that
   * already has an open reminder) and self-clearing (pingNewsletter marks
   * the task done as soon as the NL is actually sent), so it never piles
   * up duplicate reminders while a project stays overdue.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async createOverdueNewsletterTasks() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE' },
      select: {
        id: true,
        organizationId: true,
        name: true,
        lastNewsletterDate: true,
        newsletterTargetDays: true,
        assignedToId: true,
        createdById: true,
      },
    });

    let created = 0;
    for (const deal of deals) {
      const { daysSince } = computeNewsletterStatus(deal.lastNewsletterDate, deal.newsletterTargetDays);
      if (daysSince === null || daysSince < deal.newsletterTargetDays) continue;

      const existing = await this.prisma.task.findFirst({
        where: { dealId: deal.id, title: NEWSLETTER_TASK_TITLE, done: false },
        select: { id: true },
      });
      if (existing) continue;

      const assigneeId = deal.assignedToId ?? deal.createdById;
      await this.tasks.create(deal.organizationId, assigneeId, {
        title: NEWSLETTER_TASK_TITLE,
        dealId: deal.id,
        priority: 'HIGH',
        dueDate: new Date().toISOString().slice(0, 10),
        assigneeId,
      });
      created += 1;
    }

    if (created > 0) this.logger.log(`Newsletter : ${created} tâche(s) de relance créée(s) pour des dossiers en retard.`);
  }
}
