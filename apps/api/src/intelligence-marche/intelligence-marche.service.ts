import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';
import { Prisma, Priority } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { ConnectorRegistryService } from './connectors/connector-registry.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';

// Connectors that need no configuration and should always be available —
// provisioned lazily on an org's first visit so orgs created outside the
// seed script (self-registration, real-data import) get automatic coverage
// too, same as data-gouv-catalogue always has.
const DEFAULT_SOURCES: { name: string; connector: string; url: string | null }[] = [
  { name: 'data.gouv.fr — Immobilier & construction', connector: 'data-gouv-catalogue', url: 'immobilier logement construction permis de construire' },
  { name: 'data.gouv.fr — Valeurs foncières (DVF)', connector: 'data-gouv-dvf', url: null },
  { name: 'Euronews — Actualités', connector: 'euronews-breaking', url: null },
  { name: 'Yahoo Finance — BTC/USD', connector: 'yahoo-finance-btc', url: null },
];

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
  ) {}

  listConnectors() {
    return this.connectors.list();
  }

  async listSources(organizationId: string) {
    const sources = await this.prisma.newsSource.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
    const existingConnectors = new Set(sources.map((s) => s.connector));
    const missing = DEFAULT_SOURCES.filter((d) => !existingConnectors.has(d.connector));
    if (missing.length === 0) return sources;

    const created = await Promise.all(
      missing.map((d) =>
        this.prisma.newsSource.create({
          data: { organizationId, name: d.name, connector: d.connector, url: d.url, active: true },
        }),
      ),
    );
    for (const source of created) void this.ingestSource(source.id);
    return [...sources, ...created].sort((a, b) => a.name.localeCompare(b.name));
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
    return this.ingestSource(sourceId);
  }

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
