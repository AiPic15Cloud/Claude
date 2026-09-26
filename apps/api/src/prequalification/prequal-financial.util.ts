/**
 * Bilan financier normalisé (spec ATLAS "Moteur de préqualification" v1.0,
 * §9.3) — moteur pur, mêmes conventions que les autres moteurs
 * `fractional/*.util.ts` et `deals/covenant.util.ts` : interfaces nommées,
 * jamais de `any`, `null` signifie "non calculable/inconnu" et n'est jamais
 * confondu avec 0 (doctrine "Unknown ≠ Zero", spec V2 §10). Tous les montants
 * sont en euros (nombres, convertis depuis Prisma Decimal par l'appelant),
 * jamais des entiers en centimes.
 *
 * v2 (P1) — aligné sur le modèle financier réel du Deal
 * (`financial-model.service.ts`) à la demande explicite de l'utilisateur, qui
 * a fourni le classeur d'audit réel (Excel) comme référence : Foncier /
 * Travaux / Honoraires techniques / Autres frais / Financement ATLAS
 * (équivalent "Modalités LPB" du classeur) / Financement bancaire optionnel /
 * ratios de couverture avec et sans banque / sensibilité 3-scénarios.
 * `coutDeRevient` n'est donc plus la somme brute de tous les postes de coût
 * (v1, P0) mais la décomposition détaillée Foncier + Travaux + Honoraires
 * techniques + Autres frais (dont les frais de financement, calculés).
 *
 * Simplification assumée et documentée (P1) : "Besoin maximal de
 * financement" est censé être le pic de trésorerie négatif d'un calendrier
 * de flux mensuel (spec §9.3) — ce calendrier n'existe pas encore (aucun
 * suivi de trésorerie mensuelle pour un dossier de préqualification). On
 * calcule ici une approximation statique (coût de revient − apport prouvé),
 * documentée comme telle — jamais présentée comme le calendrier réel. Un vrai
 * calendrier de flux reste un axe P2.
 */

const LATE_PENALTY_RATE_POINTS = 5;
/** Frais de garantie hypothécaire estimés — même taux forfaitaire que le Deal (financial-model.service.ts). */
const GUARANTEE_FEES_RATE = 0.015;

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
  /** Postes libres de la section Travaux (category TRAVAUX). */
  travauxItems: PrequalCostLineItemInput[];
  /** Postes libres additionnels de la section Honoraires techniques (category HONORAIRES_TECHNIQUES), en plus des 4 champs fixes ci-dessous. */
  honorairesTechniquesItems: PrequalCostLineItemInput[];
  lots: PrequalLotInput[];

  /** Loyers/produits intermédiaires retenus pendant le portage — jamais un encaissement de stock résiduel (spec §9.2). */
  otherRevenueRetained: number | null;
  provenEquity: number | null;
  declaredEquity: number | null;
  declaredMarginPct: number | null;
  declaredCoutDeRevient: number | null;
  declaredChiffreAffaires: number | null;

  /** Montant recherché — joue le rôle de la "collecte" du classeur d'audit. */
  amountRequested: number | null;

  // Foncier
  landPrice: number | null;
  notaryFees: number | null;

  // Honoraires techniques — 4 champs fixes
  diagnosticsCost: number | null;
  insuranceCost: number | null;
  propertyTaxCost: number | null;
  surveyStudiesCost: number | null;

  // Autres frais (hors financement)
  agencyFees: number | null;
  referralFees: number | null;
  bankMiscFees: number | null;

  // Financement ATLAS (équivalent "Modalités LPB")
  interestRatePct: number | null;
  durationTargetMonths: number | null;
  feesPctHT: number | null;
  tvaApplicable: boolean;
  tvaRatePct: number | null;
  latePenaltyApplied: boolean;
  hypothequeEnvisagee: boolean;

  // Financement bancaire optionnel
  bankName: string | null;
  bankLoanAcquisition: number | null;
  bankLoanAccompagnement: number | null;
  bankInterestRatePct: number | null;
  bankFileFees: number | null;
  bankGuaranteeFees: number | null;
}

export interface PrequalFinancingBlock {
  collecte: number;
  tauxPct: number | null;
  tauxPctEffectif: number | null;
  /** true si la pénalité de retard est effectivement appliquée au calcul — reflète uniquement la case cochée, jamais automatique. */
  latePenaltyEffective: boolean;
  dureeCibleMonths: number | null;
  interestOnDurationCible: number;
  feesHT: number;
  feesTTC: number;
  guaranteeFeesEstimate: number;
  totalFees: number;
  netDisbursed: number;
}

export interface PrequalBankFinancingBlock {
  enabled: boolean;
  name: string | null;
  loanTotal: number;
  interestOnDurationCible: number;
  totalFees: number;
}

export interface PrequalScenario {
  label: string;
  revenue: number;
  totalCost: number;
  margin: number;
  marginPct: number | null;
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

  // Décomposition détaillée du coût de revient (classeur d'audit réel)
  foncierTotal: number;
  travauxTotal: number;
  honorairesTechniquesTotal: number;
  /** Agence + apport d'affaires + bancaire divers — hors frais de financement (calculés séparément dans `financing`). */
  autresFraisScalaires: number;
  financing: PrequalFinancingBlock;
  bank: PrequalBankFinancingBlock;
  expositionFinale: number;

  ltaPct: number | null;
  ltcPct: number | null;
  ltvPct: number | null;
  ltaAvecBanquePct: number | null;
  ltcAvecBanquePct: number | null;
  ltvAvecBanquePct: number | null;

  sensitivity: PrequalScenario[];
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

function computeScenario(label: string, revenue: number, cost: number): PrequalScenario {
  const margin = revenue - cost;
  return {
    label,
    revenue: round2(revenue),
    totalCost: round2(cost),
    margin: round2(margin),
    marginPct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : null,
  };
}

export function computePrequalFinancials(input: PrequalFinancialInput): PrequalFinancialResult {
  const foncierTotal = round2((input.landPrice ?? 0) + (input.notaryFees ?? 0));
  const travauxTotal = round2(sumCostLineItems(input.travauxItems));
  const honorairesTechniquesItemsTotal = sumCostLineItems(input.honorairesTechniquesItems);
  const honorairesTechniquesTotal = round2(
    (input.diagnosticsCost ?? 0) + (input.insuranceCost ?? 0) + (input.propertyTaxCost ?? 0) + (input.surveyStudiesCost ?? 0) + honorairesTechniquesItemsTotal,
  );

  // Financement ATLAS (équivalent "Modalités LPB" du classeur d'audit)
  const collecte = input.amountRequested ?? 0;
  const tauxPct = input.interestRatePct;
  const latePenaltyEffective = input.latePenaltyApplied;
  const tauxPctEffectif = tauxPct !== null ? tauxPct + (latePenaltyEffective ? LATE_PENALTY_RATE_POINTS : 0) : null;
  const dureeCibleMonths = input.durationTargetMonths;
  const interestOnDurationCible = tauxPctEffectif !== null && dureeCibleMonths !== null ? round2((collecte * (tauxPctEffectif / 100) * dureeCibleMonths) / 12) : 0;
  const feesHT = input.feesPctHT !== null ? round2(collecte * (input.feesPctHT / 100)) : 0;
  const feesTTC = input.tvaApplicable && input.tvaRatePct !== null ? round2(feesHT * (1 + input.tvaRatePct / 100)) : feesHT;
  const guaranteeFeesEstimate = input.hypothequeEnvisagee ? round2(collecte * GUARANTEE_FEES_RATE) : 0;
  const financingTotalFees = round2(guaranteeFeesEstimate + interestOnDurationCible + feesTTC);
  const financingNetDisbursed = round2(collecte - feesTTC);

  const financing: PrequalFinancingBlock = {
    collecte: round2(collecte),
    tauxPct,
    tauxPctEffectif,
    latePenaltyEffective,
    dureeCibleMonths,
    interestOnDurationCible,
    feesHT,
    feesTTC,
    guaranteeFeesEstimate,
    totalFees: financingTotalFees,
    netDisbursed: financingNetDisbursed,
  };

  // Financement bancaire optionnel
  const bankEnabled = Boolean(input.bankName);
  const bankLoanTotal = bankEnabled ? round2((input.bankLoanAcquisition ?? 0) + (input.bankLoanAccompagnement ?? 0)) : 0;
  const bankInterestOnDurationCible =
    bankEnabled && input.bankInterestRatePct !== null && dureeCibleMonths !== null
      ? round2((bankLoanTotal * (input.bankInterestRatePct / 100) * dureeCibleMonths) / 12)
      : 0;
  const bankTotalFees = bankEnabled ? round2(bankInterestOnDurationCible + (input.bankGuaranteeFees ?? 0) + (input.bankFileFees ?? 0) * 1.2) : 0;

  const bank: PrequalBankFinancingBlock = {
    enabled: bankEnabled,
    name: input.bankName,
    loanTotal: bankLoanTotal,
    interestOnDurationCible: bankInterestOnDurationCible,
    totalFees: bankTotalFees,
  };

  const autresFraisScalaires = round2((input.agencyFees ?? 0) + (input.referralFees ?? 0) + (input.bankMiscFees ?? 0));
  const autresFraisTotal = round2(autresFraisScalaires + financingTotalFees);

  const coutDeRevient = round2(foncierTotal + travauxTotal + honorairesTechniquesTotal + autresFraisTotal);

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

  const expositionFinale = round2(coutDeRevient - bankLoanTotal - collecte);

  // Les ratios LTA/LTC/LTV restent null sans montant recherché connu (doctrine
  // "Unknown ≠ Zero") — `collecte` ci-dessus vaut 0 par convention pour les
  // FRAIS de financement (une collecte inconnue ne doit pas empêcher
  // d'afficher un coût de revient), mais un ratio n'a pas de sens sur un
  // montant recherché supposé nul.
  const financingExposure = input.amountRequested !== null ? input.amountRequested + bankLoanTotal + bankTotalFees : null;

  const base = computeScenario('Base', chiffreAffaires, coutDeRevient);
  const sensitivity: PrequalScenario[] = [computeScenario('Pessimiste', chiffreAffaires * 0.9, coutDeRevient * 1.1), base, computeScenario('Optimiste', chiffreAffaires * 1.1, coutDeRevient * 0.9)];

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
    foncierTotal,
    travauxTotal,
    honorairesTechniquesTotal,
    autresFraisScalaires,
    financing,
    bank,
    expositionFinale,
    ltaPct: ratioPct(input.amountRequested, input.landPrice),
    ltcPct: ratioPct(input.amountRequested, coutDeRevient),
    ltvPct: ratioPct(input.amountRequested, chiffreAffaires > 0 ? chiffreAffaires : null),
    ltaAvecBanquePct: ratioPct(financingExposure, input.landPrice),
    ltcAvecBanquePct: ratioPct(financingExposure, coutDeRevient),
    ltvAvecBanquePct: ratioPct(financingExposure, chiffreAffaires > 0 ? chiffreAffaires : null),
    sensitivity,
  };
}
