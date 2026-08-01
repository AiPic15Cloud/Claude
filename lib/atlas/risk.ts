import { getAnthropicClient, ATLAS_MODEL } from "@/lib/atlas/anthropic";
import { buildPortfolioSnapshot, computeStressTest } from "@/lib/portfolio";
import { formatEur, formatEurCompact, formatPercent } from "@/lib/format";
import type { Deal, Operator } from "@/lib/types";

export interface AtlasRiskPoint {
  titre: string;
  description: string;
  severite: "critique" | "elevee" | "moderee";
}

export interface RiskNote {
  generated: true;
  indice_risque_global: number; // 0-100
  synthese: string;
  points_attention: AtlasRiskPoint[];
  recommandations: string[];
}

export interface AtlasUnavailable {
  generated: false;
  reason: string;
}

const riskNoteSchema = {
  type: "object",
  properties: {
    indice_risque_global: {
      type: "integer",
      description: "Indice de risque global du portefeuille, de 0 (aucun risque) à 100 (risque maximal)",
    },
    synthese: { type: "string", description: "2 à 4 phrases, ton direct d'un directeur des risques" },
    points_attention: {
      type: "array",
      items: {
        type: "object",
        properties: {
          titre: { type: "string" },
          description: { type: "string" },
          severite: { type: "string", enum: ["critique", "elevee", "moderee"] },
        },
        required: ["titre", "description", "severite"],
        additionalProperties: false,
      },
    },
    recommandations: {
      type: "array",
      items: { type: "string" },
      description: "Actions concrètes recommandées, 3 à 5 maximum",
    },
  },
  required: ["indice_risque_global", "synthese", "points_attention", "recommandations"],
  additionalProperties: false,
};

const ATLAS_RISK_SYSTEM_PROMPT = `Tu es Atlas Risk, l'agent en charge du risque chez Estrella Capital, société de gestion privée spécialisée en immobilier.

Ton rôle : calculer et expliquer l'exposition au risque du portefeuille, avec la rigueur d'un directeur des risques d'une institution comme Blackstone ou Brookfield. Tu ne rassures jamais artificiellement — tu identifies les concentrations, les corrélations et les scénarios de perte, puis tu recommandes des actions concrètes.

N'invente aucun chiffre : appuie-toi uniquement sur les données du contexte fourni.`;

function buildRiskContext(deals: Deal[], operators: Operator[]): string {
  const snapshot = buildPortfolioSnapshot(deals, operators);
  const stress = computeStressTest(deals);

  const lines: string[] = [];
  lines.push(`Encours total: ${formatEur(snapshot.totalEngage)}`);
  lines.push(`Score de risque pondéré: ${snapshot.risqueMoyenPondere.toFixed(1)}/10`);
  lines.push(`Rendement cible pondéré: ${formatPercent(snapshot.rendementMoyenPondere)}`);
  lines.push(`Concentration top 3 opérateurs: ${formatPercent(snapshot.concentrationTop3Operateur)}`);
  lines.push(`Concentration top 3 régions: ${formatPercent(snapshot.concentrationTop3Region)}`);
  lines.push(
    `Perte attendue simplifiée: ${formatEurCompact(stress.perteAttendueSimplifiee)} (${formatPercent(stress.perteAttendueEnPourcentage)})`,
  );
  lines.push(`Scénario dégradé (2 dossiers les plus risqués en défaut): ${formatEurCompact(stress.scenarioDegrade.montant)} — ${stress.scenarioDegrade.description}`);

  lines.push(`\nRépartition par région (montant):`);
  for (const [region, montant] of Object.entries(snapshot.montantByRegion)) {
    lines.push(`- ${region}: ${formatEurCompact(montant)}`);
  }

  lines.push(`\nRépartition par opérateur (montant):`);
  for (const [op, montant] of Object.entries(snapshot.montantByOperator)) {
    lines.push(`- ${op}: ${formatEurCompact(montant)}`);
  }

  lines.push(`\nRépartition par tranche de risque:`);
  for (const t of stress.expositionParRisque) {
    lines.push(`- ${t.tranche}: ${formatEurCompact(t.montant)} (${t.nombre} dossiers)`);
  }

  lines.push(`\nOpérateurs et indice de confiance:`);
  for (const o of operators) {
    lines.push(`- ${o.name}: confiance ${o.indice_confiance}/100, ${o.defauts_count} défaut(s), ${o.retards_count} retard(s)`);
  }

  return lines.join("\n");
}

export async function generateRiskNote(
  deals: Deal[],
  operators: Operator[],
): Promise<RiskNote | AtlasUnavailable> {
  const client = getAnthropicClient();
  if (!client) {
    return { generated: false, reason: "ANTHROPIC_API_KEY non configurée." };
  }

  try {
    const response = await client.messages.create({
      model: ATLAS_MODEL,
      max_tokens: 4096,
      system: ATLAS_RISK_SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildRiskContext(deals, operators) }],
      output_config: {
        effort: "medium",
        format: { type: "json_schema", schema: riskNoteSchema },
      },
    });

    const textBlock = response.content.find(
      (b): b is Extract<(typeof response.content)[number], { type: "text" }> => b.type === "text",
    );
    if (!textBlock) {
      return { generated: false, reason: "Atlas Risk n'a renvoyé aucun texte exploitable." };
    }

    const parsed = JSON.parse(textBlock.text) as Omit<RiskNote, "generated">;
    return { generated: true, ...parsed };
  } catch (err) {
    console.error("Atlas Risk — erreur d'appel:", err);
    return { generated: false, reason: "Erreur lors de l'appel à Atlas Risk." };
  }
}
