import { getAnthropicClient, ATLAS_MODEL } from "@/lib/atlas/anthropic";
import { buildPortfolioSnapshot, computeStressTest } from "@/lib/portfolio";
import { formatEur, formatEurCompact, formatPercent, daysUntil, formatDate } from "@/lib/format";
import { DEAL_STAGE_LABELS, DEAL_TYPE_LABELS, PIPELINE_STAGES } from "@/lib/types";
import type { Alert, AtlasTask, Deal, Operator } from "@/lib/types";

export type AtlasPriorityCategory =
  | "operation_critique"
  | "decision"
  | "risque"
  | "opportunite"
  | "calendrier";

export interface AtlasPriority {
  titre: string;
  categorie: AtlasPriorityCategory;
  urgence: "haute" | "moyenne" | "basse";
  description: string;
}

export interface MorningBrief {
  generated: true;
  priorites: AtlasPriority[];
  synthese_marche: string;
  note_cio: string;
}

export interface AtlasUnavailable {
  generated: false;
  reason: string;
}

const morningBriefSchema = {
  type: "object",
  properties: {
    priorites: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titre: { type: "string", description: "Titre court (moins de 12 mots)" },
          categorie: {
            type: "string",
            enum: ["operation_critique", "decision", "risque", "opportunite", "calendrier"],
          },
          urgence: { type: "string", enum: ["haute", "moyenne", "basse"] },
          description: { type: "string", description: "2 à 3 phrases, factuel et actionnable" },
        },
        required: ["titre", "categorie", "urgence", "description"],
        additionalProperties: false,
      },
    },
    synthese_marche: {
      type: "string",
      description: "2 à 3 phrases sur la météo du marché immobilier pertinente pour ce portefeuille",
    },
    note_cio: {
      type: "string",
      description:
        "Note manuscrite d'Atlas CIO à Nicolas, style direct et personnel, commençant par 'Bonjour Nicolas.' — analyse, challenge, recommande. 120-200 mots.",
    },
  },
  required: ["priorites", "synthese_marche", "note_cio"],
  additionalProperties: false,
};

const ATLAS_CIO_SYSTEM_PROMPT = `Tu es Atlas CIO, l'agent d'investissement en chef d'Estrella Capital, une société de gestion privée spécialisée dans l'immobilier (promotion, marchand de biens, dette privée, value-add, core+).

Tu t'adresses chaque matin à Nicolas, le fondateur. Tu ne résumes pas passivement les données : tu analyses, tu challenges, tu justifies, tu recommandes, tu priorises. Style : direct, dense, sans langue de bois, jamais complaisant.

Règles strictes :
- Jamais plus de 5 priorités. S'il y en a moins de 5 de réellement importantes, n'en donne pas plus.
- Chaque priorité doit être concrète et actionnable — pas de généralités.
- La note CIO doit ressembler à un message écrit par un associé senior à un autre, pas à un rapport généré.
- Appuie-toi uniquement sur les données fournies. N'invente aucun chiffre.`;

function buildContextBlock(input: {
  deals: Deal[];
  operators: Operator[];
  alerts: Alert[];
  tasks: AtlasTask[];
}): string {
  const snapshot = buildPortfolioSnapshot(input.deals, input.operators);
  const stress = computeStressTest(input.deals);
  const operatorById = new Map(input.operators.map((o) => [o.id, o]));

  const comiteDeals = input.deals.filter((d) => d.stage === "comite");
  const openAlerts = input.alerts.filter((a) => !a.resolved);

  const lines: string[] = [];
  lines.push(`## Portefeuille`);
  lines.push(`Encours total: ${formatEur(snapshot.totalEngage)}`);
  lines.push(`Rendement cible pondéré: ${formatPercent(snapshot.rendementMoyenPondere)}`);
  lines.push(`Score de risque pondéré: ${snapshot.risqueMoyenPondere.toFixed(1)}/10`);
  lines.push(`Concentration top 3 opérateurs: ${formatPercent(snapshot.concentrationTop3Operateur)}`);
  lines.push(`Concentration top 3 régions: ${formatPercent(snapshot.concentrationTop3Region)}`);
  lines.push(
    `Perte attendue simplifiée (stress test interne): ${formatEurCompact(stress.perteAttendueSimplifiee)} (${formatPercent(stress.perteAttendueEnPourcentage)} de l'encours)`,
  );

  lines.push(`\n## Pipeline (nombre de dossiers par étape)`);
  for (const stage of PIPELINE_STAGES) {
    lines.push(`- ${DEAL_STAGE_LABELS[stage]}: ${snapshot.countByStage[stage]}`);
  }

  if (comiteDeals.length > 0) {
    lines.push(`\n## Dossiers en comité (vote requis)`);
    for (const d of comiteDeals) {
      const op = operatorById.get(d.operator_id);
      const jours = d.vote_expires_at ? daysUntil(d.vote_expires_at) : null;
      lines.push(
        `- ${d.name} | opérateur: ${op?.name ?? d.operator_id} (confiance ${op?.indice_confiance ?? "?"}/100) | montant: ${formatEur(d.montant)} | risque: ${d.risque}/10 | statut: ${d.statut_detail} | vote expire dans ${jours ?? "?"} jours`,
      );
    }
  }

  if (openAlerts.length > 0) {
    lines.push(`\n## Alertes ouvertes`);
    for (const a of openAlerts) {
      lines.push(`- [${a.severity}] ${a.type}: ${a.message}`);
    }
  }

  if (input.tasks.filter((t) => t.status !== "fait").length > 0) {
    lines.push(`\n## Tâches en cours`);
    for (const t of input.tasks.filter((t) => t.status !== "fait")) {
      lines.push(`- (${t.priority}) ${t.title}${t.due_date ? ` — échéance ${formatDate(t.due_date)}` : ""}`);
    }
  }

  lines.push(`\n## Opérateurs sous surveillance (indice de confiance < 65)`);
  const watchlist = input.operators.filter((o) => o.indice_confiance < 65);
  if (watchlist.length === 0) {
    lines.push(`Aucun.`);
  } else {
    for (const o of watchlist) {
      lines.push(`- ${o.name}: confiance ${o.indice_confiance}/100 — ${o.notes ?? ""}`);
    }
  }

  return lines.join("\n");
}

export async function generateMorningBrief(input: {
  deals: Deal[];
  operators: Operator[];
  alerts: Alert[];
  tasks: AtlasTask[];
}): Promise<MorningBrief | AtlasUnavailable> {
  const client = getAnthropicClient();
  if (!client) {
    return { generated: false, reason: "ANTHROPIC_API_KEY non configurée." };
  }

  try {
    const response = await client.messages.create({
      model: ATLAS_MODEL,
      max_tokens: 4096,
      system: ATLAS_CIO_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildContextBlock(input) }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: morningBriefSchema },
      },
    });

    const textBlock = response.content.find(
      (b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text",
    );
    if (!textBlock) {
      return { generated: false, reason: "Atlas n'a renvoyé aucun texte exploitable." };
    }

    const parsed = JSON.parse(textBlock.text) as Omit<MorningBrief, "generated">;
    return {
      generated: true,
      ...parsed,
      priorites: parsed.priorites.slice(0, 5),
    };
  } catch (err) {
    console.error("Atlas CIO — erreur d'appel:", err);
    return { generated: false, reason: "Erreur lors de l'appel à Atlas CIO." };
  }
}
