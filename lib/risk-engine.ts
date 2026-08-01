import type { Alert, Deal, Operator } from "@/lib/types";
import { PORTFOLIO_STAGES } from "@/lib/types";

// Moteur de risque déterministe — recalculé à chaque chargement de page, sans appel
// à Atlas. Complète la note Atlas Risk (narrative, agrégée, module Portfolio) par une
// évaluation opération par opération : score, causes, probabilité, impact, actions.
// "Chaque matin. Calculer automatiquement." — spec Module 5, Risk Office.

export type RiskLevel = "faible" | "moderee" | "elevee";

export interface DealRiskAssessment {
  dealId: string;
  score: number; // 1-10, pondéré (score interne, confiance opérateur, alertes ouvertes)
  probabilite: RiskLevel;
  impact: RiskLevel;
  causes: string[];
  actionsRecommandees: string[];
}

function levelFromScore(score: number): RiskLevel {
  if (score >= 7) return "elevee";
  if (score >= 4) return "moderee";
  return "faible";
}

function levelFromMontant(montant: number): RiskLevel {
  if (montant >= 2_000_000) return "elevee";
  if (montant >= 1_000_000) return "moderee";
  return "faible";
}

export function assessDealRisk(
  deal: Deal,
  operator: Operator | null,
  dealAlerts: Alert[],
): DealRiskAssessment {
  const operatorPenalty = operator ? ((100 - operator.indice_confiance) / 100) * 10 : 5;
  const openAlerts = dealAlerts.filter((a) => !a.resolved);
  const alertPoints = openAlerts.reduce((acc, a) => {
    if (a.severity === "critique") return acc + 3;
    if (a.severity === "elevee") return acc + 1.5;
    return acc + 0.5;
  }, 0);

  const raw = deal.risque * 0.55 + operatorPenalty * 0.3 + Math.min(alertPoints, 10) * 0.15;
  const score = Math.min(10, Math.max(1, Math.round(raw * 10) / 10));

  const causes: string[] = [];
  if (deal.risque >= 7) causes.push(`Score de risque interne élevé (${deal.risque}/10)`);
  if (deal.stage === "defaut") causes.push("Dossier actuellement en défaut");
  if (operator && operator.indice_confiance < 65) {
    causes.push(`Opérateur sous surveillance — confiance ${operator.indice_confiance}/100`);
  }
  if (operator && operator.defauts_count > 0) {
    causes.push(`${operator.defauts_count} défaut(s) historique(s) chez cet opérateur`);
  }
  if (operator && operator.retards_count > 2) {
    causes.push(`${operator.retards_count} retards constatés chez cet opérateur sur d'autres dossiers`);
  }
  for (const a of openAlerts) causes.push(`${a.type} — ${a.message}`);
  if (causes.length === 0) causes.push("Aucun facteur de risque particulier identifié.");

  const actions: string[] = [];
  if (score >= 7) actions.push("Renforcer le suivi à fréquence hebdomadaire et exiger un reporting immédiat.");
  if (operator && operator.indice_confiance < 65) {
    actions.push("Limiter tout nouvel engagement avec cet opérateur tant que la confiance n'est pas rétablie.");
  }
  if (openAlerts.some((a) => a.severity === "critique")) {
    actions.push("Statuer sur l'alerte critique avant la prochaine échéance.");
  }
  if (deal.stage === "comite" && deal.vote_expires_at) {
    actions.push("Formaliser la décision de comité sans délai — le vote expire prochainement.");
  }
  if (actions.length === 0) actions.push("Poursuivre le suivi standard, aucune action immédiate requise.");

  return {
    dealId: deal.id,
    score,
    probabilite: levelFromScore(score),
    impact: levelFromMontant(deal.montant),
    causes,
    actionsRecommandees: actions,
  };
}

export function assessPortfolioRisk(
  deals: Deal[],
  operators: Operator[],
  alerts: Alert[],
): { indiceGlobal: number; assessments: DealRiskAssessment[] } {
  const portfolioDeals = deals.filter((d) => PORTFOLIO_STAGES.includes(d.stage));
  const operatorById = new Map(operators.map((o) => [o.id, o]));

  const assessments = portfolioDeals.map((deal) =>
    assessDealRisk(
      deal,
      operatorById.get(deal.operator_id) ?? null,
      alerts.filter((a) => a.related_deal_id === deal.id),
    ),
  );

  const totalMontant = portfolioDeals.reduce((acc, d) => acc + d.montant, 0);
  const weightedScore =
    totalMontant > 0
      ? assessments.reduce((acc, a, i) => acc + a.score * portfolioDeals[i].montant, 0) / totalMontant
      : 0;

  return {
    indiceGlobal: Math.round(weightedScore * 10),
    assessments: assessments.sort((a, b) => b.score - a.score),
  };
}
