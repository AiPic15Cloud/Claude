import { Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { AGENT_REGISTRY, findAgent } from './agent-registry';
import { ChatDto } from './dto/chat.dto';

@Injectable()
export class AgentsService {
  private client: Anthropic | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly scoring: ScoringService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  listAgents() {
    return AGENT_REGISTRY.map(({ key, name, description }) => ({ key, name, description }));
  }

  async chat(organizationId: string, agentKey: string, dto: ChatDto) {
    const agent = findAgent(agentKey);
    if (!agent) throw new NotFoundException('Agent inconnu');

    if (!this.client) {
      throw new ServiceUnavailableException(
        "Agents IA non configurés : définissez ANTHROPIC_API_KEY côté serveur pour activer ce module.",
      );
    }

    const contextBlock = dto.dealId ? await this.buildDealContext(organizationId, dto.dealId) : null;

    const system = contextBlock ? `${agent.systemPrompt}\n\n## Contexte du dossier\n${contextBlock}` : agent.systemPrompt;

    const response = await this.client.messages.create({
      model: this.config.get<string>('ai.anthropicModel')!,
      max_tokens: 1024,
      system,
      messages: dto.messages.map((m) => ({ role: m.role, content: m.content })),
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return {
      agent: agent.key,
      message: textBlock && 'text' in textBlock ? textBlock.text : '',
      usage: response.usage,
    };
  }

  private async buildDealContext(organizationId: string, dealId: string): Promise<string> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      include: { guarantees: true, financialAssumption: true, tags: { include: { tag: true } } },
    });
    if (!deal) return '';

    // Checkpoints and recent notes are the closest thing ATLAS has to "what
    // we actually told people, and when" — there's no stored newsletter
    // content, so this is the real history the Cohérence agent (and any
    // other agent reasoning about the dossier's track record) has to work
    // with. Oldest-first so the model reads it as a timeline.
    const [checkpoints, notes] = await Promise.all([
      this.prisma.projectCheckpoint.findMany({ where: { dealId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.note.findMany({ where: { dealId }, orderBy: { createdAt: 'desc' }, take: 5 }),
    ]);

    const score = await this.scoring.computeDealScore(organizationId, dealId, false);

    const lines = [
      `Nom : ${deal.name} (${deal.reference})`,
      `Type : ${deal.type} · Étape : ${deal.stage} · Statut : ${deal.status}`,
      `Montant cible : ${deal.amountTarget} € · Collecté : ${deal.amountRaised} €`,
      deal.interestRate ? `Taux : ${deal.interestRate}%` : null,
      deal.city ? `Localisation : ${deal.city}` : null,
      `Score ATLAS : ${score.score}/100 (${score.factors.map((f) => `${f.label}: ${f.value}`).join(', ')})`,
      deal.guarantees.length
        ? `Garanties : ${deal.guarantees.map((g) => `${g.type} — ${g.description} (${g.amount} €)`).join('; ')}`
        : 'Garanties : aucune enregistrée',
      deal.financialAssumption
        ? `Modèle financier : ${deal.financialAssumption.surfaceSqm} m², coût construction ${deal.financialAssumption.constructionCostPerSqm} €/m², prix vente ${deal.financialAssumption.sellingPricePerSqm} €/m²`
        : null,
      deal.tags.length ? `Tags : ${deal.tags.map((t) => t.tag.name).join(', ')}` : null,
      checkpoints.length
        ? `Historique des points à durée cible (du plus ancien au plus récent) :\n${checkpoints
            .map((c) => {
              const date = c.createdAt.toISOString().slice(0, 10);
              const parts = [
                c.travauxBudgetInitial !== null && c.travauxDepensesADate !== null
                  ? `travaux ${c.travauxDepensesADate}€ dépensés / ${c.travauxBudgetInitial}€ budgétés`
                  : null,
                c.travauxTermines ? 'travaux terminés' : null,
                c.commercialisationLancee ? `commercialisation lancée, ${c.pourcentageVendu ?? 0}% vendu` : 'commercialisation non lancée',
                c.prixVenteInitialPrevu !== null && c.prixVenteReelADate !== null
                  ? `prix réel ${c.prixVenteReelADate}€ vs ${c.prixVenteInitialPrevu}€ prévu`
                  : null,
                c.atterrissagePrevu ? `atterrissage annoncé : "${c.atterrissagePrevu}"` : null,
                c.notes ? `note : "${c.notes}"` : null,
              ].filter(Boolean);
              return `  [${date}] ${parts.join(' · ')}`;
            })
            .join('\n')}`
        : 'Historique des points à durée cible : aucun point enregistré.',
      notes.length
        ? `Notes récentes (les plus récentes en premier) :\n${notes
            .map((n) => `  [${n.createdAt.toISOString().slice(0, 10)}] ${n.content}`)
            .join('\n')}`
        : null,
    ].filter(Boolean);

    return lines.join('\n');
  }
}
