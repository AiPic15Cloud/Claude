import { getAnthropicClient, ATLAS_MODEL } from "@/lib/atlas/anthropic";
import { formatEur, formatPercent, formatDate } from "@/lib/format";
import { DEAL_TYPE_LABELS } from "@/lib/types";
import type { Deal, DealDocument, DealNote, Operator } from "@/lib/types";

export interface DealAnalysis {
  generated: true;
  resume_executif: string;
  scoring: number; // 1-10
  vote_recommande: "favorable" | "defavorable" | "conditionnel";
  justification: string;
  risques: string[];
  questions_pour_operateur: string[];
  conditions_recommandees: string[];
  documents_manquants: string[];
}

export interface AtlasUnavailable {
  generated: false;
  reason: string;
}

const dealAnalysisSchema = {
  type: "object",
  properties: {
    resume_executif: { type: "string", description: "3 à 5 phrases, pour un comité d'investissement" },
    scoring: { type: "integer", description: "Note globale du dossier de 1 (très faible) à 10 (excellent)" },
    vote_recommande: { type: "string", enum: ["favorable", "defavorable", "conditionnel"] },
    justification: { type: "string", description: "Justification du vote recommandé, 2 à 4 phrases" },
    risques: { type: "array", items: { type: "string" } },
    questions_pour_operateur: {
      type: "array",
      items: { type: "string" },
      description: "Questions précises à poser à l'opérateur avant le comité",
    },
    conditions_recommandees: {
      type: "array",
      items: { type: "string" },
      description: "Conditions suspensives ou de suivi à imposer",
    },
    documents_manquants: { type: "array", items: { type: "string" } },
  },
  required: [
    "resume_executif",
    "scoring",
    "vote_recommande",
    "justification",
    "risques",
    "questions_pour_operateur",
    "conditions_recommandees",
    "documents_manquants",
  ],
  additionalProperties: false,
};

const ATLAS_ANALYST_SYSTEM_PROMPT = `Tu es Atlas Analyst, analyste financier senior chez Estrella Capital (ancien Blackstone / Goldman Sachs Real Estate), spécialisé dans l'analyse de dossiers d'investissement immobilier (promotion, marchand de biens, dette privée, value-add, core+).

Pour chaque dossier, tu produis une analyse rigoureuse destinée au comité d'investissement : résumé exécutif, scoring, risques, questions à poser, conditions à imposer, documents manquants. Tu es exigeant et tu ne recommandes jamais un vote favorable sans réserve sur un dossier dont le risque n'est pas maîtrisé.

N'invente aucun chiffre : appuie-toi uniquement sur les données du contexte fourni.`;

function buildDealContext(
  deal: Deal,
  operator: Operator | null,
  notes: DealNote[],
  documents: DealDocument[],
): string {
  const lines: string[] = [];
  lines.push(`## Dossier: ${deal.name}`);
  lines.push(`Type: ${DEAL_TYPE_LABELS[deal.type]}`);
  lines.push(`Localisation: ${deal.ville}, ${deal.region}`);
  lines.push(`Montant: ${formatEur(deal.montant)}`);
  lines.push(`Rendement cible: ${formatPercent(deal.rendement_cible)}`);
  lines.push(`Durée: ${deal.duree_mois} mois`);
  lines.push(`Score de risque interne: ${deal.risque}/10`);
  lines.push(`Banque: ${deal.banque ?? "non renseignée"}`);
  lines.push(`Origine: ${deal.origine}`);
  lines.push(`Statut actuel: ${deal.statut_detail}`);
  lines.push(`Sourcé le: ${formatDate(deal.sourced_at)}`);
  lines.push(`Échéance prévue: ${formatDate(deal.echeance_prevue)}`);

  if (operator) {
    lines.push(`\n## Opérateur: ${operator.name}`);
    lines.push(`TRI moyen historique: ${formatPercent(operator.tri_moyen)}`);
    lines.push(`Délai moyen (écart vs prévisionnel): ${operator.delai_moyen_jours} jours`);
    lines.push(`Défauts: ${operator.defauts_count} | Retards: ${operator.retards_count} | Opérations: ${operator.operations_count}`);
    lines.push(`Qualité de reporting: ${operator.qualite_reporting}/10`);
    lines.push(`Indice de confiance Atlas: ${operator.indice_confiance}/100`);
    if (operator.notes) lines.push(`Notes internes: ${operator.notes}`);
  }

  if (notes.length > 0) {
    lines.push(`\n## Notes internes sur ce dossier`);
    for (const n of notes) {
      lines.push(`- (${formatDate(n.created_at)}, ${n.author}) ${n.content}`);
    }
  }

  lines.push(`\n## Documents déposés (${documents.length})`);
  if (documents.length === 0) {
    lines.push(`Aucun document déposé à ce stade.`);
  } else {
    for (const d of documents) {
      lines.push(`- ${d.name} (${d.type})`);
    }
  }

  return lines.join("\n");
}

export async function generateDealAnalysis(
  deal: Deal,
  operator: Operator | null,
  notes: DealNote[],
  documents: DealDocument[],
): Promise<DealAnalysis | AtlasUnavailable> {
  const client = getAnthropicClient();
  if (!client) {
    return { generated: false, reason: "ANTHROPIC_API_KEY non configurée." };
  }

  try {
    const response = await client.messages.create({
      model: ATLAS_MODEL,
      max_tokens: 4096,
      system: ATLAS_ANALYST_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildDealContext(deal, operator, notes, documents) }],
      output_config: {
        effort: "high",
        format: { type: "json_schema", schema: dealAnalysisSchema },
      },
    });

    const textBlock = response.content.find(
      (b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text",
    );
    if (!textBlock) {
      return { generated: false, reason: "Atlas Analyst n'a renvoyé aucun texte exploitable." };
    }

    const parsed = JSON.parse(textBlock.text) as Omit<DealAnalysis, "generated">;
    return { generated: true, ...parsed };
  } catch (err) {
    console.error("Atlas Analyst — erreur d'appel:", err);
    return { generated: false, reason: "Erreur lors de l'appel à Atlas Analyst." };
  }
}
