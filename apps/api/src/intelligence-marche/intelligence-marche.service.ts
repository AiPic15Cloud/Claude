import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
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
//
// The google-news-rss entries below reuse that one connector with a
// site-scoped search query in place of a native RSS URL — safer than
// guessing each outlet's own (often undocumented, sometimes moved) RSS
// path, since the connector already degrades to zero articles rather than
// erroring on an unexpected response.
const DEFAULT_SOURCES: { name: string; connector: string; url: string | null }[] = [
  { name: 'data.gouv.fr — Immobilier & construction', connector: 'data-gouv-catalogue', url: 'immobilier logement construction permis de construire' },
  { name: 'data.gouv.fr — Valeurs foncières (DVF)', connector: 'data-gouv-dvf', url: null },
  { name: 'Google News — Immobilier & finance', connector: 'google-news-rss', url: null },
  { name: 'Le Monde — Économie', connector: 'press-rss', url: 'https://www.lemonde.fr/economie/rss_full.xml' },
  { name: 'Le Figaro — Économie', connector: 'press-rss', url: 'https://www.lefigaro.fr/rss/figaro_economie.xml' },
  { name: 'France Info — Économie', connector: 'press-rss', url: 'https://www.francetvinfo.fr/economie.rss' },
  { name: 'Les Echos', connector: 'google-news-rss', url: 'site:lesechos.fr immobilier OR économie OR taux OR logement' },
  { name: 'Banque de France', connector: 'google-news-rss', url: 'site:banque-france.fr OR "Banque de France" taux directeur OR politique monétaire OR inflation' },
  { name: 'AMF — Financement participatif', connector: 'google-news-rss', url: 'site:amf-france.org OR "AMF" financement participatif OR crowdfunding OR régulation' },
  { name: 'Assemblée Nationale & Légifrance', connector: 'google-news-rss', url: 'site:assemblee-nationale.fr OR site:legifrance.gouv.fr logement OR immobilier OR fiscalité' },
  { name: 'Business Immo', connector: 'google-news-rss', url: 'site:businessimmo.com' },
  { name: 'Financial Times', connector: 'google-news-rss', url: 'en:site:ft.com France real estate OR "interest rates" OR ECB OR property market' },
  { name: 'Bloomberg', connector: 'google-news-rss', url: 'en:site:bloomberg.com France real estate OR "interest rates" OR ECB OR property market' },
  { name: 'Reuters', connector: 'google-news-rss', url: 'en:site:reuters.com France real estate OR "interest rates" OR ECB OR property market' },
  { name: 'AFP', connector: 'google-news-rss', url: 'site:afp.com France immobilier OR économie OR taux OR politique' },
];

// Connectors removed after turning out non-functional in production (e.g.
// unresolvable/unexpected upstream response shape) — deleted on boot rather
// than left as a dead "Collecter" button. No migration needed since it's a
// plain runtime cleanup, and cascade-deletes whatever (if any) articles that
// connector produced.
//
// yahoo-finance-btc: BTC/USD has no bearing on a real-estate crowdfunding
// platform's market intelligence — a leftover from the original seed, out
// of scope for this domain regardless of whether it ever worked.
const RETIRED_CONNECTORS = ['euronews-breaking', 'yahoo-finance-btc'];

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
export class IntelligenceMarcheService implements OnApplicationBootstrap {
  private readonly logger = new Logger(IntelligenceMarcheService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly connectors: ConnectorRegistryService,
    private readonly search: MeilisearchService,
  ) {}

  async onApplicationBootstrap() {
    const { count } = await this.prisma.newsSource.deleteMany({ where: { connector: { in: RETIRED_CONNECTORS } } });
    if (count > 0) this.logger.log(`Supprimé ${count} source(s) retirée(s) (connecteur(s) obsolète(s)).`);

    // Self-heal drift between an already-provisioned source's stored query
    // and its current DEFAULT_SOURCES entry (matched by name+connector,
    // since a source is provisioned once per org and never touched again
    // otherwise) — e.g. tuning a Google News query after the fact, or the
    // fr/FR→en:… edition fix for FT/Bloomberg/Reuters, would otherwise only
    // apply to orgs created after the change.
    for (const d of DEFAULT_SOURCES) {
      const { count: fixed } = await this.prisma.newsSource.updateMany({
        where: { name: d.name, connector: d.connector, NOT: { url: d.url } },
        data: { url: d.url },
      });
      if (fixed > 0) this.logger.log(`Requête mise à jour pour "${d.name}" sur ${fixed} organisation(s).`);
    }
  }

  listConnectors() {
    return this.connectors.list();
  }

  async listSources(organizationId: string) {
    const sources = await this.prisma.newsSource.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
    // Keyed on (connector, url), not connector alone — several DEFAULT_SOURCES
    // entries (the press-rss ones) share the same connector with different
    // feed URLs, so connector alone would treat the 2nd/3rd as already provisioned.
    const existingKeys = new Set(sources.map((s) => `${s.connector}::${s.url ?? ''}`));
    const missing = DEFAULT_SOURCES.filter((d) => !existingKeys.has(`${d.connector}::${d.url ?? ''}`));
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

  /** "Tout collecter" — ingest every active source for one org in a single action instead of clicking each one. */
  async collectAll(organizationId: string) {
    const sources = await this.prisma.newsSource.findMany({
      where: { organizationId, active: true, connector: { not: 'manual' } },
      select: { id: true },
    });
    const results = await Promise.all(sources.map((s) => this.ingestSource(s.id)));
    return { sourcesCollected: sources.length, created: results.reduce((sum, r) => sum + r.created, 0) };
  }

  /**
   * Nothing else refreshes the veille on its own — without this, content
   * only ever appears when someone remembers to click "Collecter" on every
   * source. Runs across every org's active sources once an hour; failures on
   * one source (rate limiting, a moved feed) never block the rest since
   * ingestSource already isolates per-item errors and collectAll-style
   * fan-out here isolates per-source ones the same way via Promise.allSettled.
   */
  @Cron(CronExpression.EVERY_HOUR)
  async collectAllOrgsScheduled() {
    const sources = await this.prisma.newsSource.findMany({
      where: { active: true, connector: { not: 'manual' } },
      select: { id: true, name: true },
    });
    const results = await Promise.allSettled(sources.map((s) => this.ingestSource(s.id)));
    const created = results.reduce((sum, r) => (r.status === 'fulfilled' ? sum + r.value.created : sum), 0);
    const failed = results.filter((r) => r.status === 'rejected').length;
    this.logger.log(`Collecte horaire : ${sources.length} source(s), ${created} article(s) créé(s), ${failed} échec(s).`);
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
      try {
        const hash = dedupeHash(item.title, item.url);
        const existing = await this.prisma.article.findUnique({ where: { dedupeHash: hash } });
        if (existing) continue;

        const publishedAt = item.publishedAt && !Number.isNaN(item.publishedAt.getTime()) ? item.publishedAt : new Date();
        const priority = inferPriority(item.title, item.summary);
        const article = await this.prisma.article.create({
          data: {
            organizationId: source.organizationId,
            sourceId: source.id,
            title: item.title,
            summary: item.summary,
            url: item.url,
            category: item.category,
            publishedAt,
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
            articleId: article.id,
          });
        }
      } catch (error) {
        // One malformed item (e.g. an unparseable date from a less
        // controlled feed like Google News) must never abort the rest of
        // the batch — skip it and keep going.
        this.logger.warn(`Échec d'ingestion d'un article de "${source.name}": ${(error as Error).message}`);
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
