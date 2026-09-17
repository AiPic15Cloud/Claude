/**
 * Bilan financier normalisé (spec ATLAS "Moteur de préqualification" v1.0,
 * §9.3) — moteur pur, mêmes conventions que les autres moteurs `fractional/*.util.ts`
 * et `deals/covenant.util.ts` : interfaces nommées, jamais de `any`, `null`
 * signifie "non calculable/inconnu" et n'est jamais confondu avec 0 (doctrine
 * "Unknown ≠ Zero", spec V2 §10). Tous les montants sont en euros (nombres,
 * convertis depuis Prisma Decimal par l'appelant) — même convention que le
 * reste du dépôt (CostLineItem.amount, Deal.amountTarget, etc.), jamais des
 * entiers en centimes.
 *
 * Simplification assumée et documentée (P0) : "Besoin maximal de
 * financement" est censé être le pic de trésorerie négatif d'un calendrier
 * de flux mensuel (spec §9.3) — ce calendrier n'existe pas encore dans ce P0
 * (aucun suivi de trésorerie mensuelle pour un dossier de préqualification).
 * On calcule ici une approximation statique (coût de revient − apport
 * prouvé), documentée comme telle dans PrequalFinancialResult — jamais
 * présentée comme le calendrier réel. Un vrai calendrier de flux reste un
 * axe P1.
 */

export interface PrequalCostLineItemInput {
  category: string;
  label: string;
  amount: number;
}

export interface PrequalLotInput {
  label: string;
  surfaceSqm: number | null;
  askingPrice: number | null;
  expectedPrice: number | null;
}

export interface PrequalFinancialInput {
  costLineItems: PrequalCostLineItemInput[];
  lots: PrequalLotInput[];
  /** Loyers/produits intermédiaires retenus pendant le portage — jamais un encaissement de stock résiduel (spec §9.2). */
  otherRevenueRetained: number | null;
  provenEquity: number | null;
  declaredEquity: number | null;
  declaredMarginPct: number | null;
  declaredCoutDeRevient: number | null;
  declaredChiffreAffaires: number | null;
  amountRequested: number | null;
  landPrice: number | null;
  bankDebt: number | null;
  includeBankDebtInRatios: boolean;
}

export interface PrequalFinancialResult {
  coutDeRevient: number;
  /** Somme des lots ayant un prix renseigné (expectedPrice, sinon askingPrice) — jamais gonflée d'un prix supposé pour les lots sans prix. */
  chiffreAffaires: number;
  /** Nombre de lots sans aucun prix renseigné — signale que chiffreAffaires est potentiellement incomplet, jamais silencieusement ignoré. */
  lotsWithoutPriceCount: number;
  marge: number;
  margePct: number | null;
  /** margePct − declaredMarginPct, si les deux sont connus — l'écart lui-même, jamais un jugement implicite sur lequel est "vrai". */
  margeEcartVsAnnonceePts: number | null;
  coutDeRevientEcartVsDeclare: number | null;
  chiffreAffairesEcartVsDeclare: number | null;
  besoinMaxFinancement: number | null;
  /** Prix de sortie pondéré au m² — somme(prix)/somme(surface) sur les lots ayant les deux renseignés uniquement. */
  prixSortiePondereParM2: number | null;
  pointMortAuM2: number | null;
  ltaPct: number | null;
  ltcPct: number | null;
  ltvPct: number | null;
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

function sumCostLineItems(items: PrequalCostLineItemInput[]): number {
  return items.reduce((sum, item) => sum + item.amount, 0);
}

function ratioPct(numerator: number | null, denominator: number | null): number | null {
  if (numerator === null || denominator === null || denominator <= 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

export function computePrequalFinancials(input: PrequalFinancialInput): PrequalFinancialResult {
  const coutDeRevient = round2(sumCostLineItems(input.costLineItems));

  let chiffreAffaires = 0;
  let lotsWithoutPriceCount = 0;
  let weightedPriceSum = 0;
  let weightedSurfaceSum = 0;
  let vendableSurfaceSum = 0;

  for (const lot of input.lots) {
    const price = lot.expectedPrice ?? lot.askingPrice;
    if (price === null) {
      lotsWithoutPriceCount += 1;
    } else {
      chiffreAffaires += price;
    }
    if (lot.surfaceSqm !== null) vendableSurfaceSum += lot.surfaceSqm;
    if (price !== null && lot.surfaceSqm !== null && lot.surfaceSqm > 0) {
      weightedPriceSum += price;
      weightedSurfaceSum += lot.surfaceSqm;
    }
  }
  chiffreAffaires = round2(chiffreAffaires);

  const otherRevenue = input.otherRevenueRetained ?? 0;
  const marge = round2(chiffreAffaires + otherRevenue - coutDeRevient);
  const totalRevenueRetained = chiffreAffaires + otherRevenue;
  const margePct = totalRevenueRetained > 0 ? Math.round((marge / totalRevenueRetained) * 1000) / 10 : null;

  const margeEcartVsAnnonceePts = margePct !== null && input.declaredMarginPct !== null ? Math.round((margePct - input.declaredMarginPct) * 10) / 10 : null;

  const coutDeRevientEcartVsDeclare = input.declaredCoutDeRevient !== null ? round2(coutDeRevient - input.declaredCoutDeRevient) : null;
  const chiffreAffairesEcartVsDeclare = input.declaredChiffreAffaires !== null ? round2(chiffreAffaires - input.declaredChiffreAffaires) : null;

  // Approximation statique — voir avertissement en tête de fichier.
  const besoinMaxFinancement = input.provenEquity !== null ? round2(coutDeRevient - input.provenEquity) : null;

  const prixSortiePondereParM2 = weightedSurfaceSum > 0 ? round2(weightedPriceSum / weightedSurfaceSum) : null;

  const pointMortAuM2 = vendableSurfaceSum > 0 ? round2((coutDeRevient - otherRevenue) / vendableSurfaceSum) : null;

  const bankDebtAdd = input.includeBankDebtInRatios ? (input.bankDebt ?? 0) : 0;
  const financing = input.amountRequested !== null ? input.amountRequested + bankDebtAdd : null;

  return {
    coutDeRevient,
    chiffreAffaires,
    lotsWithoutPriceCount,
    marge,
    margePct,
    margeEcartVsAnnonceePts,
    coutDeRevientEcartVsDeclare,
    chiffreAffairesEcartVsDeclare,
    besoinMaxFinancement,
    prixSortiePondereParM2,
    pointMortAuM2,
    ltaPct: ratioPct(financing, input.landPrice),
    ltcPct: ratioPct(financing, coutDeRevient),
    ltvPct: ratioPct(financing, chiffreAffaires > 0 ? chiffreAffaires : null),
  };
}
