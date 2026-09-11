import { computeXirr, type CashFlow } from '../deals/xirr.util';

/**
 * Deal Economics & Stakeholder Waterfall Engine (spec V3.1 §29, marqué "P0
 * CRITIQUE"). Chemin OPT-IN : n'est invoqué que si le dossier a des
 * FractionalStakeholder + FractionalWaterfallTier configurés — sinon
 * returns.util.ts/operating-model.util.ts (le split simple
 * income/capital share déjà en production) reste la voie utilisée.
 *
 * Simplifications P0 assumées et documentées :
 * - Preferred return non composé (pay-as-you-go, pas d'accumulation
 *   inter-années d'un déficit de preferred non payé) — un vrai moteur de
 *   fund waterfall composerait le hurdle non servi ; ajout possible en P1.
 * - Catch-up à passage unique : le bénéficiaire reçoit jusqu'à
 *   catchUpPct × cumul des preferred returns déjà versés aux autres
 *   bénéficiaires, borné au pool disponible.
 * - RESIDUAL_SPLIT et CARRIED_INTEREST à même `order` sont traités comme un
 *   groupe simultané, répartis proportionnellement à leur sharePct.
 * - Financing fees (service de la dette) non modélisé — dette éventuelle
 *   non prise en compte dans le pool annuel (cohérent avec l'absence
 *   d'échéancier de dette dans returns.util.ts).
 */

export type StakeholderRole = 'INVESTOR' | 'PLATFORM' | 'SPONSOR' | 'ARRANGER' | 'ASSET_MANAGER' | 'PROPERTY_MANAGER' | 'LENDER' | 'ADVISOR' | 'OTHER';
export type FeeType = 'ENTRY' | 'RUNNING' | 'TRANSACTION' | 'FINANCING' | 'EXIT' | 'CARRY' | 'REVENUE_SHARE' | 'CAPITAL_GAIN_SHARE';
export type FeeCalculationBase = 'PRIX_NET_VENDEUR' | 'COUT_TOTAL' | 'GAV' | 'NAV' | 'LOYERS_BRUTS' | 'LOYERS_NETS' | 'NOI' | 'CAPITAL_COLLECTE' | 'PLUS_VALUE' | 'AUTRE';
export type WaterfallTierType = 'PREFERRED_RETURN' | 'RETURN_OF_CAPITAL' | 'CATCH_UP' | 'CARRIED_INTEREST' | 'RESIDUAL_SPLIT';

export interface StakeholderInput {
  id: string;
  role: StakeholderRole;
  name: string;
  capitalEngaged: number | null;
}

export interface FeeDefinitionInput {
  id: string;
  stakeholderId: string;
  feeType: FeeType;
  ratePct: number | null;
  fixedAmount: number | null;
  calculationBase: FeeCalculationBase;
  startYear: number | null;
  endYear: number | null;
}

export interface WaterfallTierInput {
  id: string;
  beneficiaryStakeholderId: string | null;
  order: number;
  type: WaterfallTierType;
  hurdleRatePct: number | null;
  catchUpPct: number | null;
  sharePct: number | null;
}

export interface YearContext {
  year: number;
  prixNetVendeur: number;
  coutTotal: number;
  assetValue: number; // sert de base GAV/NAV — pas de dette modélisée en P0, NAV ≈ GAV
  grossPotentialRent: number;
  noi: number;
  capitalCollecte: number;
  /** Cash disponible avant frais RUNNING/TRANSACTION mais après CAPEX — NOI - CAPEX de l'année. */
  propertyLevelCashFlow: number;
}

export interface StakeholderWaterfallInput {
  asOfDate: Date;
  stakeholders: StakeholderInput[];
  feeDefinitions: FeeDefinitionInput[];
  tiers: WaterfallTierInput[];
  years: YearContext[];
  /** Produit net de cession (déjà net des coûts de vente, avant frais EXIT et waterfall). */
  netSaleProceeds: number;
  plusValue: number;
}

interface StakeholderReceipt {
  /** Année de détention (1..holdPeriodYears) — les flux de sortie (frais EXIT, waterfall terminal) portent la dernière année, jamais 0/t0 (voir computeStakeholderWaterfall). */
  year: number;
  category: 'FEE' | 'PREFERRED_RETURN' | 'RETURN_OF_CAPITAL' | 'CATCH_UP' | 'CARRIED_INTEREST' | 'RESIDUAL_SPLIT';
  amount: number;
}

export interface StakeholderResult {
  stakeholderId: string;
  name: string;
  role: StakeholderRole;
  capitalEngaged: number | null;
  totalFeeIncome: number;
  totalWaterfallIncome: number;
  totalReceipts: number;
  netProfit: number | null;
  irrPct: number | null;
  multiple: number | null;
  receipts: StakeholderReceipt[];
}

export interface StakeholderWaterfallResult {
  stakeholders: StakeholderResult[];
  totalFeeLoadPct: number;
  valueCaptureRatio: Record<string, number>;
  reconciled: boolean;
  unallocatedAmount: number;
  alignment: {
    sponsorEquityRatioPct: number | null;
    feeVsSponsorEquityRatioPct: number | null;
    carrySubordinatedToHurdle: boolean | null;
  };
}

function resolveFeeBase(base: FeeCalculationBase, ctx: { prixNetVendeur: number; coutTotal: number; assetValue: number; grossPotentialRent: number; noi: number; capitalCollecte: number; plusValue: number }): number {
  switch (base) {
    case 'PRIX_NET_VENDEUR':
      return ctx.prixNetVendeur;
    case 'COUT_TOTAL':
      return ctx.coutTotal;
    case 'GAV':
    case 'NAV':
      return ctx.assetValue;
    case 'LOYERS_BRUTS':
      return ctx.grossPotentialRent;
    case 'LOYERS_NETS':
    case 'NOI':
      return ctx.noi;
    case 'CAPITAL_COLLECTE':
      return ctx.capitalCollecte;
    case 'PLUS_VALUE':
      return ctx.plusValue;
    default:
      return 0;
  }
}

function feeAmount(fee: FeeDefinitionInput, base: number): number {
  if (fee.fixedAmount !== null) return fee.fixedAmount;
  if (fee.ratePct !== null) return base * (fee.ratePct / 100);
  return 0;
}

export function computeStakeholderWaterfall(input: StakeholderWaterfallInput): StakeholderWaterfallResult {
  const receiptsByStakeholder = new Map<string, StakeholderReceipt[]>();
  const addReceipt = (stakeholderId: string, receipt: StakeholderReceipt) => {
    if (!receiptsByStakeholder.has(stakeholderId)) receiptsByStakeholder.set(stakeholderId, []);
    receiptsByStakeholder.get(stakeholderId)!.push(receipt);
  };
  for (const s of input.stakeholders) receiptsByStakeholder.set(s.id, []);

  const outstandingCapital = new Map<string, number>();
  for (const s of input.stakeholders) outstandingCapital.set(s.id, s.capitalEngaged ?? 0);

  const cumulativePreferredPaid = new Map<string, number>();
  for (const s of input.stakeholders) cumulativePreferredPaid.set(s.id, 0);

  let totalUnallocated = 0;

  // Fees + waterfall pool par année (RUNNING/TRANSACTION déduits du pool avant les tiers).
  for (const year of input.years) {
    let pool = year.propertyLevelCashFlow;

    for (const fee of input.feeDefinitions) {
      if (fee.feeType !== 'RUNNING' && fee.feeType !== 'TRANSACTION') continue;
      if (fee.startYear !== null && year.year < fee.startYear) continue;
      if (fee.endYear !== null && year.year > fee.endYear) continue;
      const base = resolveFeeBase(fee.calculationBase, { ...year, plusValue: 0 });
      const amount = Math.min(Math.max(pool, 0), feeAmount(fee, base));
      pool -= amount;
      addReceipt(fee.stakeholderId, { year: year.year, category: 'FEE', amount });
    }

    pool = Math.max(pool, 0);
    totalUnallocated += runTiers(pool, year.year, input.tiers, outstandingCapital, cumulativePreferredPaid, addReceipt);
  }

  // Sortie : frais EXIT déduits du produit net, puis le solde entre dans la
  // waterfall. Daté à la dernière année d'exploitation (l'exit coïncide avec
  // la fin de l'horizon de détention) — jamais à t0 : un stakeholder dont
  // tous les flux tombent à la même date que son apport initial n'a
  // mathématiquement pas de TRI défini (voir computeXirr), ce qui produisait
  // un TRI null à tort pour tout bénéficiaire payé uniquement à la sortie.
  const terminalYear = input.years.length > 0 ? input.years[input.years.length - 1].year : 1;
  let terminalPool = input.netSaleProceeds;
  for (const fee of input.feeDefinitions) {
    if (fee.feeType !== 'EXIT') continue;
    const base = resolveFeeBase(fee.calculationBase, { prixNetVendeur: 0, coutTotal: 0, assetValue: input.netSaleProceeds, grossPotentialRent: 0, noi: 0, capitalCollecte: 0, plusValue: input.plusValue });
    const amount = Math.min(Math.max(terminalPool, 0), feeAmount(fee, base));
    terminalPool -= amount;
    addReceipt(fee.stakeholderId, { year: terminalYear, category: 'FEE', amount });
  }
  // Le retour de capital et le solde résiduel passent aussi par les tiers RETURN_OF_CAPITAL/RESIDUAL_SPLIT à la sortie.
  terminalPool = Math.max(terminalPool, 0);
  totalUnallocated += runTiers(terminalPool, terminalYear, input.tiers, outstandingCapital, cumulativePreferredPaid, addReceipt);

  // Entry fees (one-off, appliqués à t0 — informatif, déjà budgétés dans Sources & Uses côté sources-uses.util.ts).
  for (const fee of input.feeDefinitions) {
    if (fee.feeType !== 'ENTRY') continue;
    const first = input.years[0];
    const base = first ? resolveFeeBase(fee.calculationBase, { ...first, plusValue: 0 }) : 0;
    addReceipt(fee.stakeholderId, { year: input.years[0]?.year ?? 1, category: 'FEE', amount: feeAmount(fee, base) });
  }

  const stakeholders: StakeholderResult[] = input.stakeholders.map((s) => {
    const receipts = receiptsByStakeholder.get(s.id) ?? [];
    const totalFeeIncome = receipts.filter((r) => r.category === 'FEE').reduce((sum, r) => sum + r.amount, 0);
    const totalWaterfallIncome = receipts.filter((r) => r.category !== 'FEE').reduce((sum, r) => sum + r.amount, 0);
    const totalReceipts = totalFeeIncome + totalWaterfallIncome;
    const netProfit = s.capitalEngaged !== null ? totalReceipts - s.capitalEngaged : null;

    let irrPct: number | null = null;
    let multiple: number | null = null;
    if (s.capitalEngaged !== null && s.capitalEngaged > 0) {
      const cashFlows: CashFlow[] = [{ date: input.asOfDate, amount: -s.capitalEngaged }];
      for (const r of receipts) {
        const date = new Date(input.asOfDate);
        date.setFullYear(date.getFullYear() + r.year);
        cashFlows.push({ date, amount: r.amount });
      }
      const irr = computeXirr(cashFlows);
      irrPct = irr === null ? null : irr * 100;
      multiple = totalReceipts / s.capitalEngaged;
    }

    return { stakeholderId: s.id, name: s.name, role: s.role, capitalEngaged: s.capitalEngaged, totalFeeIncome, totalWaterfallIncome, totalReceipts, netProfit, irrPct, multiple, receipts };
  });

  const totalInvestorCapital = input.stakeholders.filter((s) => s.role === 'INVESTOR').reduce((sum, s) => sum + (s.capitalEngaged ?? 0), 0);
  const totalNonInvestorFees = stakeholders.filter((s) => s.role !== 'INVESTOR').reduce((sum, s) => sum + s.totalFeeIncome + (s.role !== 'SPONSOR' ? s.totalWaterfallIncome : 0), 0);
  const totalFeeLoadPct = totalInvestorCapital > 0 ? (totalNonInvestorFees / totalInvestorCapital) * 100 : 0;

  const totalValueCreated = stakeholders.reduce((sum, s) => sum + (s.netProfit ?? s.totalReceipts), 0);
  const valueCaptureRatio: Record<string, number> = {};
  for (const s of stakeholders) {
    valueCaptureRatio[s.stakeholderId] = totalValueCreated !== 0 ? ((s.netProfit ?? s.totalReceipts) / totalValueCreated) * 100 : 0;
  }

  const sponsor = input.stakeholders.find((s) => s.role === 'SPONSOR');
  const investorCapital = totalInvestorCapital;
  const sponsorEquityRatioPct = sponsor?.capitalEngaged ? (sponsor.capitalEngaged / (sponsor.capitalEngaged + investorCapital)) * 100 : null;
  const fixedFeesNonInvestor = stakeholders.filter((s) => s.role !== 'INVESTOR' && s.role !== 'SPONSOR').reduce((sum, s) => sum + s.totalFeeIncome, 0);
  const feeVsSponsorEquityRatioPct = sponsor?.capitalEngaged ? (fixedFeesNonInvestor / sponsor.capitalEngaged) * 100 : null;
  const preferredTier = input.tiers.find((t) => t.type === 'PREFERRED_RETURN');
  const carryTier = input.tiers.find((t) => t.type === 'CARRIED_INTEREST');
  const carrySubordinatedToHurdle = carryTier ? (preferredTier ? carryTier.order > preferredTier.order : false) : null;

  return {
    stakeholders,
    totalFeeLoadPct,
    valueCaptureRatio,
    reconciled: Math.abs(totalUnallocated) < 1,
    unallocatedAmount: totalUnallocated,
    alignment: { sponsorEquityRatioPct, feeVsSponsorEquityRatioPct, carrySubordinatedToHurdle },
  };
}

const SOLVER_MAX_ITERATIONS = 60;
const SOLVER_TOLERANCE_PCT = 0.01;

export interface StakeholderReverseSolverResult {
  value: number | null;
  achievedInvestorIrrPct: number | null;
}

function primaryInvestorIrr(result: StakeholderWaterfallResult): number | null {
  const investor = result.stakeholders.find((s) => s.role === 'INVESTOR');
  return investor?.irrPct ?? null;
}

/**
 * Reverse Solver — extension Deal Economics (spec §29.10). Bissecte un
 * facteur d'échelle appliqué soit à tous les FeeDefinition non-investisseur
 * (max total fee load), soit au seul tier CARRIED_INTEREST (max carry),
 * jusqu'à ce que le TRI investisseur atteigne le hurdle cible. Un facteur
 * de 1.0 = les paramètres saisis tels quels ; l'appelant applique le
 * facteur résultant aux taux réels pour obtenir la borne en points de %.
 */
function solveScaleFactor(computeIrrAtScale: (scale: number) => number | null, targetHurdlePct: number): { scale: number | null; achievedInvestorIrrPct: number | null } {
  let low = 0;
  let high = 5;
  const irrAtLow = computeIrrAtScale(low);
  const irrAtHigh = computeIrrAtScale(high);
  if (irrAtLow === null || irrAtHigh === null || irrAtLow < targetHurdlePct) {
    return { scale: null, achievedInvestorIrrPct: irrAtLow };
  }
  if (irrAtHigh >= targetHurdlePct) {
    return { scale: high, achievedInvestorIrrPct: irrAtHigh };
  }

  let mid = (low + high) / 2;
  for (let i = 0; i < SOLVER_MAX_ITERATIONS; i++) {
    mid = (low + high) / 2;
    const irr = computeIrrAtScale(mid);
    if (irr === null) break;
    if (Math.abs(irr - targetHurdlePct) < SOLVER_TOLERANCE_PCT) break;
    if (irr < targetHurdlePct) high = mid;
    else low = mid;
  }
  return { scale: mid, achievedInvestorIrrPct: computeIrrAtScale(mid) };
}

export function solveMaxTotalFeeLoad(base: StakeholderWaterfallInput, targetHurdlePct: number): StakeholderReverseSolverResult {
  const computeAtScale = (scale: number) => {
    const scaledFees = base.feeDefinitions.map((f) => ({
      ...f,
      ratePct: f.ratePct !== null ? f.ratePct * scale : null,
      fixedAmount: f.fixedAmount !== null ? f.fixedAmount * scale : null,
    }));
    return primaryInvestorIrr(computeStakeholderWaterfall({ ...base, feeDefinitions: scaledFees }));
  };
  const { scale, achievedInvestorIrrPct } = solveScaleFactor(computeAtScale, targetHurdlePct);
  const baseFeeTotal = base.feeDefinitions.reduce((sum, f) => sum + (f.ratePct ?? 0) + (f.fixedAmount ?? 0), 0);
  return { value: scale === null ? null : baseFeeTotal * scale, achievedInvestorIrrPct };
}

export function solveMaxCarry(base: StakeholderWaterfallInput, targetHurdlePct: number): StakeholderReverseSolverResult {
  const carryTier = base.tiers.find((t) => t.type === 'CARRIED_INTEREST');
  if (!carryTier || carryTier.sharePct === null) return { value: null, achievedInvestorIrrPct: primaryInvestorIrr(computeStakeholderWaterfall(base)) };

  const computeAtScale = (scale: number) => {
    const scaledTiers = base.tiers.map((t) => (t.id === carryTier.id ? { ...t, sharePct: Math.min(100, (t.sharePct ?? 0) * scale) } : t));
    return primaryInvestorIrr(computeStakeholderWaterfall({ ...base, tiers: scaledTiers }));
  };
  const { scale, achievedInvestorIrrPct } = solveScaleFactor(computeAtScale, targetHurdlePct);
  return { value: scale === null ? null : Math.min(100, carryTier.sharePct * scale), achievedInvestorIrrPct };
}

function runTiers(
  poolIn: number,
  year: number,
  tiers: WaterfallTierInput[],
  outstandingCapital: Map<string, number>,
  cumulativePreferredPaid: Map<string, number>,
  addReceipt: (stakeholderId: string, receipt: StakeholderReceipt) => void,
): number {
  let pool = poolIn;
  const sortedOrders = Array.from(new Set(tiers.map((t) => t.order))).sort((a, b) => a - b);

  for (const order of sortedOrders) {
    if (pool <= 0) break;
    const group = tiers.filter((t) => t.order === order);

    for (const tier of group) {
      if (pool <= 0) break;
      if (!tier.beneficiaryStakeholderId) continue;

      if (tier.type === 'PREFERRED_RETURN') {
        const capital = outstandingCapital.get(tier.beneficiaryStakeholderId) ?? 0;
        const accrued = capital * ((tier.hurdleRatePct ?? 0) / 100);
        const amount = Math.min(pool, accrued);
        pool -= amount;
        cumulativePreferredPaid.set(tier.beneficiaryStakeholderId, (cumulativePreferredPaid.get(tier.beneficiaryStakeholderId) ?? 0) + amount);
        addReceipt(tier.beneficiaryStakeholderId, { year, category: 'PREFERRED_RETURN', amount });
      } else if (tier.type === 'RETURN_OF_CAPITAL') {
        const capital = outstandingCapital.get(tier.beneficiaryStakeholderId) ?? 0;
        const amount = Math.min(pool, capital);
        pool -= amount;
        outstandingCapital.set(tier.beneficiaryStakeholderId, capital - amount);
        addReceipt(tier.beneficiaryStakeholderId, { year, category: 'RETURN_OF_CAPITAL', amount });
      } else if (tier.type === 'CATCH_UP') {
        const totalPreferredPaidToOthers = Array.from(cumulativePreferredPaid.entries())
          .filter(([id]) => id !== tier.beneficiaryStakeholderId)
          .reduce((sum, [, v]) => sum + v, 0);
        const target = totalPreferredPaidToOthers * ((tier.catchUpPct ?? 0) / 100);
        const alreadyReceived = 0; // simplification P0 : pas de suivi cumulatif inter-années du catch-up déjà versé
        const amount = Math.min(pool, Math.max(0, target - alreadyReceived));
        pool -= amount;
        addReceipt(tier.beneficiaryStakeholderId, { year, category: 'CATCH_UP', amount });
      }
    }

    // CARRIED_INTEREST / RESIDUAL_SPLIT du même groupe : split proportionnel simultané du pool restant.
    const splitTiers = group.filter((t) => (t.type === 'CARRIED_INTEREST' || t.type === 'RESIDUAL_SPLIT') && t.beneficiaryStakeholderId);
    if (splitTiers.length > 0 && pool > 0) {
      const poolAtSplit = pool;
      for (const tier of splitTiers) {
        const amount = poolAtSplit * ((tier.sharePct ?? 0) / 100);
        pool -= amount;
        addReceipt(tier.beneficiaryStakeholderId!, { year, category: tier.type === 'CARRIED_INTEREST' ? 'CARRIED_INTEREST' : 'RESIDUAL_SPLIT', amount });
      }
    }
  }

  return Math.max(pool, 0);
}
