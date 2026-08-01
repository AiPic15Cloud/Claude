import {
  DEAL_STAGES,
  PORTFOLIO_STAGES,
  type Deal,
  type DealStage,
  type Operator,
  type PortfolioSnapshot,
} from "@/lib/types";

function sumBy<T>(items: T[], key: (item: T) => number): number {
  return items.reduce((acc, item) => acc + key(item), 0);
}

function groupSumByKey(deals: Deal[], key: (d: Deal) => string): Record<string, number> {
  const out: Record<string, number> = {};
  for (const d of deals) {
    const k = key(d);
    out[k] = (out[k] ?? 0) + d.montant;
  }
  return out;
}

function topNConcentration(byKey: Record<string, number>, total: number, n: number): number {
  if (total === 0) return 0;
  const sorted = Object.values(byKey).sort((a, b) => b - a);
  const topSum = sorted.slice(0, n).reduce((a, b) => a + b, 0);
  return (topSum / total) * 100;
}

export function buildPortfolioSnapshot(allDeals: Deal[], operators: Operator[]): PortfolioSnapshot {
  const portfolioDeals = allDeals.filter((d) => PORTFOLIO_STAGES.includes(d.stage));
  const totalEngage = sumBy(portfolioDeals, (d) => d.montant);

  const countByStage = Object.fromEntries(
    DEAL_STAGES.map((stage) => [stage, allDeals.filter((d) => d.stage === stage).length]),
  ) as Record<DealStage, number>;

  const montantByRegion = groupSumByKey(portfolioDeals, (d) => d.region);
  const montantByOperator = groupSumByKey(portfolioDeals, (d) =>
    operators.find((o) => o.id === d.operator_id)?.name ?? d.operator_id,
  );
  const montantByType = groupSumByKey(portfolioDeals, (d) => d.type);
  const montantByBanque = groupSumByKey(portfolioDeals, (d) => d.banque ?? "Non renseignée");
  const montantByOrigine = groupSumByKey(portfolioDeals, (d) => d.origine);

  const rendementMoyenPondere =
    totalEngage > 0
      ? sumBy(portfolioDeals, (d) => d.montant * d.rendement_cible) / totalEngage
      : 0;
  const risqueMoyenPondere =
    totalEngage > 0 ? sumBy(portfolioDeals, (d) => d.montant * d.risque) / totalEngage : 0;

  return {
    deals: allDeals,
    operators,
    totalEngage,
    countByStage,
    montantByRegion,
    montantByOperator,
    montantByType,
    montantByBanque,
    montantByOrigine,
    rendementMoyenPondere,
    risqueMoyenPondere,
    concentrationTop3Operateur: topNConcentration(montantByOperator, totalEngage, 3),
    concentrationTop3Region: topNConcentration(montantByRegion, totalEngage, 3),
  };
}

export interface StressTestResult {
  // Perte attendue simplifiée = montant * (risque/10) * facteur de perte en cas de défaut.
  // Il ne s'agit PAS d'un modèle de VaR actuariel — c'est un indicateur d'ordre de grandeur
  // pour prioriser l'attention du comité, calculé à partir du score de risque interne (1-10)
  // et d'une hypothèse de perte en cas de défaut (LGD) de 35%, standard pour de la dette
  // immobilière court terme adossée à un actif physique.
  perteAttendueSimplifiee: number;
  perteAttendueEnPourcentage: number;
  expositionParRisque: { tranche: string; montant: number; nombre: number }[];
  scenarioDegrade: { montant: number; description: string };
}

export interface BreakdownRow {
  label: string;
  montant: number;
  nombre: number;
  part: number; // % du total
}

export function buildBreakdown(
  deals: Deal[],
  keyFn: (d: Deal) => string,
  scope: "portfolio" | "all" = "portfolio",
): BreakdownRow[] {
  const source = scope === "portfolio" ? deals.filter((d) => PORTFOLIO_STAGES.includes(d.stage)) : deals;
  const total = sumBy(source, (d) => d.montant);
  const buckets = new Map<string, { montant: number; nombre: number }>();

  for (const d of source) {
    const label = keyFn(d);
    const current = buckets.get(label) ?? { montant: 0, nombre: 0 };
    current.montant += d.montant;
    current.nombre += 1;
    buckets.set(label, current);
  }

  return Array.from(buckets.entries())
    .map(([label, { montant, nombre }]) => ({
      label,
      montant,
      nombre,
      part: total > 0 ? (montant / total) * 100 : 0,
    }))
    .sort((a, b) => b.montant - a.montant);
}

export function rendementBucket(rendement: number): string {
  if (rendement < 8) return "< 8%";
  if (rendement < 12) return "8% – 12%";
  if (rendement < 16) return "12% – 16%";
  return "≥ 16%";
}

export function dureeBucket(duree: number): string {
  if (duree < 12) return "< 12 mois";
  if (duree < 24) return "12 – 24 mois";
  if (duree < 36) return "24 – 36 mois";
  return "≥ 36 mois";
}

export function montantBucket(montant: number): string {
  if (montant < 1_000_000) return "< 1 M€";
  if (montant < 2_000_000) return "1 M€ – 2 M€";
  if (montant < 4_000_000) return "2 M€ – 4 M€";
  return "≥ 4 M€";
}

const LGD_HYPOTHESE = 0.35;

export function computeStressTest(allDeals: Deal[]): StressTestResult {
  const portfolioDeals = allDeals.filter((d) => PORTFOLIO_STAGES.includes(d.stage));
  const total = sumBy(portfolioDeals, (d) => d.montant);

  const perteAttendueSimplifiee = sumBy(
    portfolioDeals,
    (d) => d.montant * (d.risque / 10) * LGD_HYPOTHESE,
  );

  const tranches: { label: string; test: (r: number) => boolean }[] = [
    { label: "Risque faible (1-3)", test: (r) => r <= 3 },
    { label: "Risque modéré (4-6)", test: (r) => r >= 4 && r <= 6 },
    { label: "Risque élevé (7-10)", test: (r) => r >= 7 },
  ];

  const expositionParRisque = tranches.map(({ label, test }) => {
    const subset = portfolioDeals.filter((d) => test(d.risque));
    return {
      tranche: label,
      montant: sumBy(subset, (d) => d.montant),
      nombre: subset.length,
    };
  });

  // Scénario dégradé : les 2 dossiers les plus risqués passent en défaut avec LGD de 60%.
  const worstTwo = [...portfolioDeals].sort((a, b) => b.risque - a.risque).slice(0, 2);
  const scenarioDegradeMontant = sumBy(worstTwo, (d) => d.montant * 0.6);

  return {
    perteAttendueSimplifiee,
    perteAttendueEnPourcentage: total > 0 ? (perteAttendueSimplifiee / total) * 100 : 0,
    expositionParRisque,
    scenarioDegrade: {
      montant: scenarioDegradeMontant,
      description:
        worstTwo.length > 0
          ? `Défaut simultané des dossiers les plus exposés (${worstTwo.map((d) => d.name).join(", ")}) avec une perte en cas de défaut de 60%.`
          : "Aucun dossier en portefeuille.",
    },
  };
}
