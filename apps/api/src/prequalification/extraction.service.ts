import { BadRequestException, Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Anthropic from '@anthropic-ai/sdk';
import { zodOutputFormat } from '@anthropic-ai/sdk/helpers/zod';
import { z } from 'zod/v4';
import { PrequalDocumentsService } from './documents.service';
import { buildDocumentContentBlock } from '../agents/document-content.util';

/**
 * `sourcePage` est auto-déclaré par le modèle en lisant le PDF, jamais une
 * citation vérifiée par l'API native `citations` d'Anthropic (non câblée
 * dans ce dépôt) — à présenter côté UI comme "page indiquée par l'IA, à
 * vérifier", jamais comme une preuve certaine (doctrine du P0 préqual).
 * Chaque champ est nullable : le modèle doit dire "absent" plutôt que
 * deviner — même doctrine que FinancialExtractionSchema (agents.service.ts).
 */
const ExtractionSchema = z.object({
  project: z
    .object({
      address: z.string().nullable(),
      city: z.string().nullable(),
      postcode: z.string().nullable(),
      existingSurfaceSqm: z.number().nullable(),
      createdSurfaceSqm: z.number().nullable(),
      lotCount: z.number().nullable().describe('Nombre de lots prévus'),
      acquisitionPrice: z.number().nullable(),
      worksDescription: z.string().nullable(),
      sourcePage: z.number().nullable(),
    })
    .nullable(),
  financial: z
    .object({
      amountRequested: z.number().nullable().describe('Montant de financement recherché, en euros'),
      declaredEquity: z.number().nullable().describe("Apport annoncé par l'opérateur, en euros"),
      declaredMarginPct: z.number().nullable().describe('Marge annoncée, en % du CA'),
      declaredCoutDeRevient: z.number().nullable(),
      declaredChiffreAffaires: z.number().nullable(),
      sourcePage: z.number().nullable(),
    })
    .nullable(),
  costLineItems: z.array(
    z.object({
      category: z.string().describe('ex. Foncier, Travaux, Honoraires, Frais financiers, Aléas'),
      label: z.string(),
      amount: z.number(),
      sourcePage: z.number().nullable(),
    }),
  ),
  lots: z.array(
    z.object({
      label: z.string(),
      surfaceSqm: z.number().nullable(),
      askingPrice: z.number().nullable(),
      expectedPrice: z.number().nullable(),
      sourcePage: z.number().nullable(),
    }),
  ),
  people: z.array(
    z.object({
      fullName: z.string(),
      role: z.string().nullable().describe('ex. porteur principal, associé, dirigeant, garant'),
      sourcePage: z.number().nullable(),
    }),
  ),
  companies: z.array(
    z.object({
      legalName: z.string(),
      siren: z.string().nullable(),
      sourcePage: z.number().nullable(),
    }),
  ),
  notes: z.string().describe('Incertitudes, hypothèses de lecture, incohérences internes au document, ou champs non trouvés.'),
});

const EXTRACTION_SYSTEM_PROMPT =
  "Tu extrais les données d'un dossier de préqualification immobilière (business plan, note de " +
  "présentation, bilan financier) transmis en pièce jointe : profil du projet (adresse, surfaces, " +
  "lots, prix d'acquisition, travaux), bilan financier (montant recherché, apport annoncé, coût de " +
  "revient, chiffre d'affaires, marge, postes de coût détaillés), lots à commercialiser, porteurs et " +
  "sociétés mentionnés. Pour chaque fait extrait, indique dans sourcePage le numéro de page du " +
  "document où tu l'as trouvé — une estimation de ta part, pas une garantie. Ne complète un champ que " +
  "si la valeur est explicitement présente dans le document, ou directement calculable à partir de " +
  "chiffres qui y sont explicitement présents (indique alors le calcul dans notes) ; sinon laisse-le " +
  "à null ou omets l'élément de liste. Ne devine et n'invente jamais une donnée.";

/**
 * Suggestion en lecture seule — n'écrit rien dans le dossier de
 * préqualification. L'analyste relit chaque champ et l'applique
 * explicitement (via les routes CRUD existantes + evidence.upsert avec le
 * statut adéquat), même doctrine que AgentsService.extractFinancials() côté
 * Deal : l'IA assiste, ne décide jamais seule.
 */
@Injectable()
export class ExtractionService {
  private client: Anthropic | null = null;

  constructor(
    private readonly config: ConfigService,
    private readonly documents: PrequalDocumentsService,
  ) {
    const apiKey = this.config.get<string>('ai.anthropicApiKey');
    if (apiKey) this.client = new Anthropic({ apiKey });
  }

  async extract(organizationId: string, caseId: string, documentId: string) {
    if (!this.client) {
      throw new ServiceUnavailableException("Agents IA non configurés : définissez ANTHROPIC_API_KEY côté serveur pour activer ce module.");
    }

    const { buffer, mimeType, name } = await this.documents.getBuffer(organizationId, caseId, documentId);
    const built = await buildDocumentContentBlock(buffer, mimeType, name);
    if (!built.ok) throw new BadRequestException(built.error);

    const response = await this.client.messages.parse({
      model: this.config.get<string>('ai.anthropicModel')!,
      max_tokens: 4096,
      system: EXTRACTION_SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: [built.block, { type: 'text', text: `Extrait les données du document « ${name} » pour ce dossier de préqualification.` }],
        },
      ],
      output_config: { format: zodOutputFormat(ExtractionSchema) },
    });

    const parsed = response.parsed_output;
    if (!parsed) {
      throw new ServiceUnavailableException("L'extraction n'a pas pu être interprétée — réessayez ou vérifiez le document.");
    }

    return { ...parsed, sourceDocumentId: documentId, sourceDocumentName: name };
  }
}
