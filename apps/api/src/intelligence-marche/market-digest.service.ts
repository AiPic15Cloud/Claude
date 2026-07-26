import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../common/prisma/prisma.service';

interface DigestResult {
  available: boolean;
  reason?: 'not_configured' | 'no_articles' | 'error';
  bullets: string[];
  generatedAt: string | null;
}

const CACHE_TTL_MS = 6 * 60 * 60_000;

/**
 * A genuine LLM-generated daily digest — built strictly from articles this
 * organization actually collected (data.gouv.fr + manual entries), never
 * invented. Requires ANTHROPIC_API_KEY; without it (or without any recent
 * articles to summarize) it reports why rather than fabricating bullets.
 */
@Injectable()
export class MarketDigestService {
  private readonly logger = new Logger(MarketDigestService.name);
  private client: Anthropic | null = null;
  private cache = new Map<string, { fetchedAt: number; result: DigestResult }>();

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  async getDigest(organizationId: string): Promise<DigestResult> {
    const cached = this.cache.get(organizationId);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached.result;
    }

    if (!this.client) {
      return { available: false, reason: 'not_configured', bullets: [], generatedAt: null };
    }

    const articles = await this.prisma.article.findMany({
      where: { organizationId },
      orderBy: { publishedAt: 'desc' },
      take: 15,
      include: { source: { select: { name: true } } },
    });

    if (articles.length === 0) {
      return { available: false, reason: 'no_articles', bullets: [], generatedAt: null };
    }

    try {
      const articlesText = articles
        .map((a) => `- [${a.category}] ${a.title}${a.summary ? ` — ${a.summary}` : ''} (source: ${a.source?.name ?? 'inconnue'})`)
        .join('\n');

      const response = await this.client.messages.create({
        model: this.config.get<string>('ai.anthropicModel')!,
        max_tokens: 500,
        system:
          "Tu es l'analyste marché d'une plateforme de gestion d'opérations immobilières (crowdfunding, promotion, marchand de biens). " +
          "On te donne une liste d'actualités déjà collectées. Rédige un résumé synthétique en 3 à 5 puces courtes (une phrase max chacune), " +
          "orienté impact opérationnel pour un gérant de portefeuille. N'invente aucun fait qui ne figure pas dans la liste fournie. " +
          'Réponds uniquement avec les puces, une par ligne, commençant par "- ".',
        messages: [{ role: 'user', content: `Actualités récentes :\n${articlesText}` }],
      });

      const textBlock = response.content.find((block) => block.type === 'text');
      const text = textBlock && 'text' in textBlock ? textBlock.text : '';
      const bullets = text
        .split('\n')
        .map((line) => line.replace(/^[-•]\s*/, '').trim())
        .filter(Boolean);

      const result: DigestResult = { available: true, bullets, generatedAt: new Date().toISOString() };
      this.cache.set(organizationId, { fetchedAt: Date.now(), result });
      return result;
    } catch (error) {
      this.logger.warn(`Digest generation failed: ${(error as Error).message}`);
      return { available: false, reason: 'error', bullets: [], generatedAt: null };
    }
  }
}
