import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import * as crypto from 'crypto';
import { Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';

const HIGH_PRIORITY_KEYWORDS = [
  'taux',
  'inflation',
  'défaut',
  'retard',
  'levée',
  'rachat',
  'faillite',
  'sanction',
  'liquidation',
];

function dedupeHash(title: string, url?: string | null): string {
  return crypto
    .createHash('sha256')
    .update(`${title.trim().toLowerCase()}|${(url ?? '').trim().toLowerCase()}`)
    .digest('hex');
}

function inferPriority(title: string, summary?: string | null): Priority {
  const text = `${title} ${summary ?? ''}`.toLowerCase();
  return HIGH_PRIORITY_KEYWORDS.some((k) => text.includes(k)) ? Priority.HIGH : Priority.MEDIUM;
}

@Injectable()
export class IntelligenceMarcheService {
  private readonly logger = new Logger(IntelligenceMarcheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly connectors: ConnectorRegistryService,
    private readonly search: MeilisearchService,
    @InjectQueue('market-intelligence') private readonly queue: Queue,
  ) {}

  listConnectors() {
    return this.connectors.list();
  }

  async listSources(organizationId: string) {
    const sources = await this.prisma.newsSource.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
    if (sources.length > 0) return sources;

    // Orgs created outside the seed script (self-registration, real-data
    // import) never got the default automatic source — provision it lazily
    // on first visit instead of leaving the module looking empty forever.
    const defaultSource = await this.prisma.newsSource.create({
      data: {
        organizationId,
        name: 'data.gouv.fr — Immobilier & construction',
        connector: 'data-gouv-catalogue',
        url: 'immobilier logement construction permis de construire',
        active: true,
      },
    });
    void this.ingestSource(defaultSource.id);
    return [defaultSource];
  }

  createSource(organizationId: string, dto: CreateSourceDto) {
    return this.prisma.newsSource.create({ data: { organizationId, ...dto } });
  }

  async setSourceActive(organizationId: string, id: string, active: boolean) {
    const source = await this.prisma.newsSource.findFirst({ where: { id, organizationId } });
    if (!source) throw new NotFoundException('Source introuvable');
    return this.prisma.newsSource.update({ where: { id }, data: { active } });
  }

  async enqueueFetch(organizationId: string, sourceId: string) {
    const source = await this.prisma.newsSource.findFirst({ where: { id: sourceId, organizationId } });
    if (!source) throw new NotFoundException('Source introuvable');
    await this.queue.add('ingest-source', { sourceId }, { removeOnComplete: true, removeOnFail: 50 });
    return { queued: true };
  }

  /** Runs synchronously — invoked by the BullMQ processor, and directly for the "manual" connector's no-op path. */
  async ingestSource(sourceId: string) {
    const source = await this.prisma.newsSource.findUnique({ where: { id: sourceId } });
    if (!source || !source.active) return { created: 0 };

    const connector = this.connectors.get(source.connector);
    if (!connector) {
      this.logger.warn(`Unknown connector "${source.connector}" for source ${source.id}`);
      return { created: 0 };
    }

    const fetched = await connector.fetchArticles(source.url);
    let created = 0;

    for (const item of fetched) {
      const hash = dedupeHash(item.title, item.url);
      const existing = await this.prisma.article.findUnique({ where: { dedupeHash: hash } });
      if (existing) continue;

      const priority = inferPriority(item.title, item.summary);
      const article = await this.prisma.article.create({
        data: {
          organizationId: source.organizationId,
          sourceId: source.id,
          title: item.title,
          summary: item.summary,
          url: item.url,
          category: item.category,
          publishedAt: item.publishedAt,
          dedupeHash: hash,
          priority,
        },
      });
      created += 1;
      void this.search.indexArticle({
        id: article.id,
        organizationId: article.organizationId,
        title: article.title,
        summary: article.summary,
        category: article.category,
        publishedAt: article.publishedAt.toISOString(),
      });

      if (priority === Priority.HIGH) {
        await this.alerts.create(source.organizationId, {
          title: 'Nouvelle actualité prioritaire',
          message: article.title,
          severity: 'WARNING',
        });
      }
    }

    await this.prisma.newsSource.update({ where: { id: source.id }, data: { lastFetchedAt: new Date() } });
    return { created };
  }

  async createManualArticle(organizationId: string, dto: CreateArticleDto) {
    const source = await this.prisma.newsSource.findFirst({
      where: { id: dto.sourceId, organizationId },
    });
    if (!source) throw new NotFoundException('Source introuvable');

    const hash = dedupeHash(dto.title, dto.url);
    const article = await this.prisma.article.create({
      data: {
        organizationId,
        sourceId: dto.sourceId,
        title: dto.title,
        summary: dto.summary,
        url: dto.url,
        category: dto.category ?? 'AUTRE',
        publishedAt: dto.publishedAt ? new Date(dto.publishedAt) : new Date(),
        dedupeHash: hash,
        priority: inferPriority(dto.title, dto.summary),
      },
    });
    void this.search.indexArticle({
      id: article.id,
      organizationId: article.organizationId,
      title: article.title,
      summary: article.summary,
      category: article.category,
      publishedAt: article.publishedAt.toISOString(),
    });
    return article;
  }

  async listArticles(organizationId: string, query: QueryArticlesDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 30;
    const where: Prisma.ArticleWhereInput = {
      organizationId,
      ...(query.category ? { category: query.category } : {}),
      ...(query.search
        ? { title: { contains: query.search, mode: 'insensitive' as Prisma.QueryMode } }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.article.findMany({
        where,
        include: { source: { select: { id: true, name: true, connector: true } } },
        orderBy: { publishedAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.article.count({ where }),
    ]);

    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  }
}
