import { PORTFOLIO_STAGES, type Deal } from "@/lib/types";

// Calculs de performance simplifiés à partir des données de dossier (montant, rendement
// cible, durée). En l'absence d'un modèle de cashflows détaillé (appels de capital et
// distributions), ces indicateurs sont des ESTIMATIONS — clairement distinguées entre
// "cible" (projeté à la souscription) et "réalisé" (extrait du statut du dossier une fois
// remboursé). Un vrai calcul de TRI/TVPI/DPI nécessiterait la table de cashflows réels.

export interface DealPerformance {
  dealId: string;
  name: string;
  montant: number;
  statut: "projete" | "realise" | "en_defaut";
  triCible: number; // % annualisé, cible à la souscription
  triRealise: number | null; // % annualisé, uniquement si extrait d'un dossier remboursé
  multiple: number; // valeur totale / capital investi, projeté ou réalisé
  tvpi: number; // Total Value to Paid-In — ici équivalent au multiple (pas de valeur résiduelle distincte modélisée)
  dpi: number; // Distributed to Paid-In — 0 tant que le dossier n'est pas remboursé
}

function extractRealizedTri(statutDetail: string): number | null {
  const match = statutDetail.match(/TRI final\s+([\d,.]+)\s*%/i);
  if (!match) return null;
  return parseFloat(match[1].replace(",", "."));
}

function compoundMultiple(annualRatePercent: number, months: number): number {
  return Math.pow(1 + annualRatePercent / 100, months / 12);
}

export function computeDealPerformance(deal: Deal): DealPerformance {
  const triRealise = deal.stage === "rembourse" ? extractRealizedTri(deal.statut_detail) : null;
  const triEffectif = triRealise ?? deal.rendement_cible;
  const multiple = compoundMultiple(triEffectif, deal.duree_mois);

  let statut: DealPerformance["statut"] = "projete";
  let dpi = 0;
  if (deal.stage === "rembourse") {
    statut = "realise";
    dpi = multiple;
  } else if (deal.stage === "defaut") {
    statut = "en_defaut";
    dpi = 0;
  }

  return {
    dealId: deal.id,
    name: deal.name,
    montant: deal.montant,
    statut,
    triCible: deal.rendement_cible,
    triRealise,
    multiple,
    tvpi: multiple,
    dpi,
  };
}

export interface PortfolioPerformance {
  totalEngage: number;
  triPondere: number;
  multiplePondere: number;
  tvpiPondere: number;
  dpiPondere: number;
  deals: DealPerformance[];
}

export function computePortfolioPerformance(allDeals: Deal[]): PortfolioPerformance {
  const portfolioDeals = allDeals.filter((d) => PORTFOLIO_STAGES.includes(d.stage));
  const deals = portfolioDeals.map(computeDealPerformance);
  const totalEngage = deals.reduce((acc, d) => acc + d.montant, 0);

  const weighted = (key: keyof Pick<DealPerformance, "triRealise" | "triCible" | "multiple" | "tvpi" | "dpi">) =>
    totalEngage > 0
      ? deals.reduce((acc, d) => acc + (d[key] ?? d.triCible) * d.montant, 0) / totalEngage
      : 0;

  return {
    totalEngage,
    triPondere: weighted("triCible"),
    multiplePondere: weighted("multiple"),
    tvpiPondere: weighted("tvpi"),
    dpiPondere: weighted("dpi"),
    deals: deals.sort((a, b) => b.montant - a.montant),
  };
}
