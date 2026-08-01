import { BadRequestException, Injectable, NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { PrismaService } from '../common/prisma/prisma.service';
import { ScoringService } from '../scoring/scoring.service';
import { DocumentsService } from '../documents/documents.service';
import { AGENT_REGISTRY, findAgent, marginBand } from './agent-registry';
import { ChatDto } from './dto/chat.dto';
import { buildDocumentContentBlock } from './document-content.util';

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
    private readonly scoring: ScoringService,
    private readonly documents: DocumentsService,
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

    const response = await this.client.messages.create({
      model: this.config.get<string>('ai.anthropicModel')!,
      max_tokens: 4096,
      system,
      messages,
    });

    const textBlock = response.content.find((block) => block.type === 'text');
    return {
      agent: agent.key,
      message: textBlock && 'text' in textBlock ? textBlock.text : '',
      usage: response.usage,
    };
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

    return { ...parsed, marginBand: marginBand(parsed.margePct), sourceDocument: name };
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
