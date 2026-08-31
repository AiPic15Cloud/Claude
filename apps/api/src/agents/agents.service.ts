import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { PrismaService } from '../common/prisma/prisma.service';
import { DocumentsService } from '../documents/documents.service';
import { RiskEngineService, PORTEUR_LABEL } from '../risk-engine/risk-engine.service';
import { RiskDataService } from '../risk-data/risk-data.service';
import { ActivitiesService } from '../activities/activities.service';
import { GraphService } from '../graph/graph.service';
import { AGENT_REGISTRY, findAgent, marginBand } from './agent-registry';
import { ChatDto } from './dto/chat.dto';
import { buildDocumentContentBlock } from './document-content.util';

interface RawChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

// Mirrors the Fiche Produit section of the audit classeur (agent-registry.ts AUDIT_FRAMEWORK) —
// every field nullable so the model can express "information absente" instead of guessing.
const FinancialExtractionSchema = z.object({
  coutDeRevientTotal: z.number().nullable().describe("Coût de revient total de l'opération, en euros"),
  chiffreAffairesTotal: z.number().nullable().describe("Chiffre d'affaires total prévisionnel, en euros"),
  margeEuros: z.number().nullable().describe('Marge en euros (CA − coût de revient)'),
  margePct: z.number().nullable().describe('Marge en pourcentage du chiffre d\'affaires'),
  surfaceM2: z.number().nullable().describe('Surface totale du projet, en m²'),
  prixAcquisitionM2: z.number().nullable().describe("Prix au m² à l'acquisition du foncier"),
  coutTravauxM2: z.number().nullable().describe('Coût des travaux par m²'),
  montantTravaux: z.number().nullable().describe('Montant total des travaux, en euros'),
  aleasTravauxPct: z.number().nullable().describe('Provision pour aléas travaux, en % du montant des travaux'),
  prixSortieM2: z.number().nullable().describe('Prix de sortie (vente) par m²'),
  tauxInteretPct: z.number().nullable().describe("Taux d'intérêt du financement, en %"),
  dureeMinMois: z.number().nullable().describe('Durée minimale du financement, en mois'),
  dureeCibleMois: z.number().nullable().describe('Durée cible du financement, en mois'),
  dureeMaxMois: z.number().nullable().describe('Durée maximale du financement, en mois'),
  apportPdp: z.number().nullable().describe('Apport du porteur de projet, en euros'),
  montantBanque: z.number().nullable().describe('Montant financé par la banque, en euros'),
  garanties: z.string().nullable().describe('Sûretés/garanties mentionnées dans le document'),
  notes: z
    .string()
    .describe(
      'Incertitudes, hypothèses de calcul retenues, incohérences internes au document, ou liste des champs non trouvés',
    ),
});

const EXTRACTION_SYSTEM_PROMPT =
  "Tu extrais les données financières d'un business plan d'opérateur immobilier transmis en pièce " +
  'jointe, selon la Fiche Produit du classeur d\'audit de référence : coût de revient, chiffre ' +
  "d'affaires, marge (€ et %), surface, prix d'acquisition/m², coût travaux/m², montant total des " +
  'travaux, aléas travaux (%), prix de sortie/m², financement (taux, durée min/cible/max, apport du ' +
  'porteur, montant banque), garanties. Ne complète un champ que si la valeur est explicitement ' +
  'présente dans le document, ou directement calculable à partir de chiffres qui y sont explicitement ' +
  'présents (indique alors le calcul dans le champ notes) ; sinon laisse-le à null. Ne devine et ' +
  "n'invente jamais une donnée. Dans le champ notes, résume les incertitudes, les hypothèses de " +
  'calcul retenues et toute incohérence interne constatée dans le document.';

@Injectable()
export class AgentsService {
  private client: Anthropic | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
    private readonly documents: DocumentsService,
    private readonly riskEngine: RiskEngineService,
    private readonly riskData: RiskDataService,
    private readonly activities: ActivitiesService,
    private readonly graph: GraphService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  listAgents() {
    return AGENT_REGISTRY.map(({ key, name, description }) => ({ key, name, description }));
  }

  /**
   * Validation/setup only — throws NotFoundException/BadRequestException/
   * ServiceUnavailableException as before. Kept separate from streamText()
   * so the controller can await this (and let Nest's normal exception
   * filters produce a proper status + JSON body) BEFORE any response bytes
   * are written, then switch to manual streaming only once we know the
   * request is valid.
   */
  async prepareChat(organizationId: string, agentKey: string, dto: ChatDto): Promise<{ system: string; messages: Anthropic.MessageParam[] }> {
    const agent = findAgent(agentKey);
    if (!agent) throw new NotFoundException('Agent inconnu');

    if (!this.client) {
      throw new ServiceUnavailableException(
        "Agents IA non configurés : définissez ANTHROPIC_API_KEY côté serveur pour activer ce module.",
      );
    }

    if (dto.documentId && !dto.dealId) {
      throw new BadRequestException('documentId nécessite dealId — le document est rattaché à un dossier.');
    }

    const contextBlock = dto.dealId ? await this.buildDealContext(organizationId, dto.dealId) : null;

    const system = contextBlock ? `${agent.systemPrompt}\n\n## Contexte du dossier\n${contextBlock}` : agent.systemPrompt;

    const messages: Anthropic.MessageParam[] = dto.messages.map((m) => ({ role: m.role, content: m.content }));

    if (dto.documentId && dto.dealId) {
      const { buffer, mimeType, name } = await this.documents.getBuffer(organizationId, dto.dealId, dto.documentId);
      const built = buildDocumentContentBlock(buffer, mimeType, name);
      if (!built.ok) throw new BadRequestException(built.error);

      const last = messages[messages.length - 1];
      if (last && last.role === 'user') {
        const text = typeof last.content === 'string' ? last.content : '';
        last.content = [built.block, { type: 'text', text }];
      }
    }

    return { system, messages };
  }

  /**
   * Same as prepareChat(), but for a file that isn't (and won't be) a Document
   * row — lets the general Agents IA page (no dealId, no dossier) analyze an
   * ad hoc upload without requiring the operation to already exist in the
   * portfolio.
   */
  async prepareChatWithFile(
    organizationId: string,
    agentKey: string,
    dto: { history: RawChatMessage[]; message: string; dealId?: string },
    file: { buffer: Buffer; mimeType: string; name: string },
  ): Promise<{ system: string; messages: Anthropic.MessageParam[] }> {
    const agent = findAgent(agentKey);
    if (!agent) throw new NotFoundException('Agent inconnu');

    if (!this.client) {
      throw new ServiceUnavailableException(
        "Agents IA non configurés : définissez ANTHROPIC_API_KEY côté serveur pour activer ce module.",
      );
    }

    const built = buildDocumentContentBlock(file.buffer, file.mimeType, file.name);
    if (!built.ok) throw new BadRequestException(built.error);

    const contextBlock = dto.dealId ? await this.buildDealContext(organizationId, dto.dealId) : null;
    const system = contextBlock ? `${agent.systemPrompt}\n\n## Contexte du dossier\n${contextBlock}` : agent.systemPrompt;

    const messages: Anthropic.MessageParam[] = dto.history.map((m) => ({ role: m.role, content: m.content }));
    messages.push({ role: 'user', content: [built.block, { type: 'text', text: dto.message }] });

    return { system, messages };
  }

  /**
   * Pure generation — yields text deltas as Claude produces them. Call only
   * after prepareChat(WithFile) has validated the request.
   *
   * max_tokens à 4096 coupait net les analyses longues (audit financier
   * multi-sections, grille de risque détaillée...) en plein milieu d'une
   * phrase, sans le moindre signal — le texte partiel était persisté comme
   * si la réponse était complète. Relevé à 64000 (plafond de sortie du
   * modèle configuré) ; si la limite est malgré tout atteinte, on l'affiche
   * explicitement plutôt que de laisser la coupure silencieuse.
   */
  async *streamText(system: string, messages: Anthropic.MessageParam[]): AsyncGenerator<string> {
    const stream = this.client!.messages.stream({
      model: this.config.get<string>('ai.anthropicModel')!,
      max_tokens: 64000,
      system,
      messages,
    });

    for await (const event of stream) {
      if (event.type === 'content_block_delta' && event.delta.type === 'text_delta') {
        yield event.delta.text;
      }
      if (event.type === 'message_delta' && event.delta.stop_reason === 'max_tokens') {
        yield '\n\n*(Réponse interrompue — limite de longueur atteinte. Redemandez la suite si besoin.)*';
      }
    }
  }

  /**
   * Loads the full Assistant IA conversation for a deal — every agent's
   * replies and the Devil's Advocate's, interleaved in send order, exactly
   * as the frontend renders them in a single thread per dossier.
   */
  async loadAgentMessages(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Dossier introuvable');

    const rows = await this.prisma.agentMessage.findMany({ where: { dealId }, orderBy: { createdAt: 'asc' } });
    return rows.map((r) => ({
      role: r.role as 'user' | 'assistant',
      content: r.content,
      source: r.agentKey === 'devil' ? ('devil' as const) : undefined,
    }));
  }

  /**
   * Persists one turn of the Assistant IA conversation. Silently a no-op if
   * dealId doesn't resolve within the caller's organization — chat still
   * works for a deal the user can't see, it just won't be remembered.
   */
  async recordAgentMessage(
    organizationId: string,
    userId: string,
    dealId: string,
    agentKey: string,
    role: 'user' | 'assistant',
    content: string,
  ): Promise<void> {
    if (!content) return;
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) return;
    await this.prisma.agentMessage.create({ data: { dealId, agentKey, role, content, createdById: userId } });
  }

  async extractFinancials(organizationId: string, dealId: string, documentId: string) {
    if (!this.client) {
      throw new ServiceUnavailableException(
        "Agents IA non configurés : définissez ANTHROPIC_API_KEY côté serveur pour activer ce module.",
      );
    }

    const { buffer, mimeType, name } = await this.documents.getBuffer(organizationId, dealId, documentId);
    const built = buildDocumentContentBlock(buffer, mimeType, name);
    if (!built.ok) throw new BadRequestException(built.error);

    const response = await this.client.messages.parse({
      model: this.config.get<string>('ai.anthropicModel')!,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [built.block, { type: 'text', text: `Extrait les données financières du document « ${name} ».` }],
        },
      ],
      output_config: { format: zodOutputFormat(FinancialExtractionSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new ServiceUnavailableException("L'extraction n'a pas pu être interprétée — réessayez ou vérifiez le document.");
    }

    return { ...parsed, marginBand: marginBand(parsed.margePct), sourceDocument: name, documentId };
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
    const [checkpoints, notes, riskBreakdown, recentActivities, entityLinks, articles] = await Promise.all([
      this.prisma.projectCheckpoint.findMany({ where: { dealId }, orderBy: { createdAt: 'asc' } }),
      this.prisma.note.findMany({ where: { dealId }, orderBy: { createdAt: 'desc' }, take: 5 }),
      this.riskEngine.computeDealRisk(organizationId, dealId, false),
      this.activities.listForDeal(organizationId, dealId),
      this.graph.listDealLinks(organizationId, dealId),
      this.prisma.article.findMany({
        where: { organizationId },
        orderBy: [{ priority: 'desc' }, { publishedAt: 'desc' }],
        take: 10,
        include: { source: { select: { name: true } } },
      }),
    ]);

    // Environnement : lecture cache-seule (RiskDataService.peekCached), jamais d'appel réseau
    // synchrone dans un chemin de chat — omis silencieusement si le cache est vide (cas normal
    // tant que l'onglet Risques du dossier n'a pas été ouvert au moins une fois).
    const envProfile =
      deal.lat !== null && deal.lng !== null ? this.riskData.peekCached(Number(deal.lat), Number(deal.lng)) : null;
    const envLabels = envProfile
      ? [envProfile.floodZone?.present ? `inondation (${envProfile.floodZone.niveau ?? 'niveau inconnu'})` : null, envProfile.seismicZone?.present ? `sismique (${envProfile.seismicZone.niveau ?? 'niveau inconnu'})` : null].filter(
          (l): l is string => l !== null,
        )
      : [];

    const lines = [
      `Nom : ${deal.name} (${deal.reference})`,
      `Type : ${deal.type} · Étape : ${deal.stage} · Statut : ${deal.status}`,
      `Montant cible : ${deal.amountTarget} € · Collecté : ${deal.amountRaised} €`,
      deal.interestRate ? `Taux : ${deal.interestRate}%` : null,
      deal.city ? `Localisation : ${deal.city}` : null,
      riskBreakdown.suppressed || riskBreakdown.composite.score === null
        ? 'Risque (Risk Engine) : dossier clos, non noté.'
        : `Risque (Risk Engine) : ${riskBreakdown.composite.score}/100, statut de surveillance ${riskBreakdown.surveillance.status}, tendance ${riskBreakdown.composite.trend} — principaux facteurs : ${riskBreakdown.triggered
            .slice(0, 3)
            .map((t) => t.label)
            .join(', ')}`,
      deal.porteurSiren
        ? `Surveillance du porteur (SIREN ${deal.porteurSiren}) : ${PORTEUR_LABEL[deal.porteurMonitoringStatus ?? ''] ?? 'statut inconnu.'}`
        : null,
      envLabels.length ? `Risques environnementaux identifiés : ${envLabels.join(', ')}.` : null,
      deal.guarantees.length
        ? `Garanties : ${deal.guarantees.map((g) => `${g.type} — ${g.description} (${g.amount} €)`).join('; ')}`
        : 'Garanties : aucune enregistrée',
      deal.financialAssumption
        ? `Modèle financier : ${deal.financialAssumption.surfaceSqm} m², prix de vente ${deal.financialAssumption.sellingPricePerSqm} €/m²${deal.financialAssumption.landPrice ? `, foncier ${deal.financialAssumption.landPrice} €` : ''} — détail complet du coût de revient (travaux, honoraires, financement) dans l'onglet Modèle financier du dossier`
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
      recentActivities.length
        ? `Journal de décisions (les 15 plus récentes, ordre antéchronologique) :\n${recentActivities
            .slice(0, 15)
            .map((a) => `  [${a.createdAt.toISOString().slice(0, 10)}] ${a.message}`)
            .join('\n')}`
        : 'Journal de décisions : aucune activité enregistrée.',
      entityLinks.length
        ? `Entités liées (Knowledge Graph) : ${entityLinks.map((l) => `${l.entity.name} (${l.entity.type}, rôle : ${l.role})`).join('; ')}`
        : null,
      articles.length
        ? `Actualité marché récente (Intelligence Marché, la plus prioritaire en premier) :\n${articles
            .map((a) => `  [${a.publishedAt.toISOString().slice(0, 10)}] [${a.category}] ${a.title}${a.summary ? ` — ${a.summary}` : ''} (source : ${a.source?.name ?? 'inconnue'})`)
            .join('\n')}`
        : null,
    ].filter(Boolean);

    return lines.join('\n');
  }
}
