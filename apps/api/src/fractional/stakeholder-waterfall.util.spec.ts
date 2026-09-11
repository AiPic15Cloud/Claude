import { computeStakeholderWaterfall, type StakeholderWaterfallInput, type YearContext } from './stakeholder-waterfall.util';

/**
 * Régression ciblée sur les 4 bugs trouvés en revue de code (cf. commit
 * "fix(fractional): 4 bugs trouvés en revue de code dans le Stakeholder
 * Waterfall Engine") : sur-distribution silencieuse, double paiement du
 * catch-up, frais d'entrée mal datés, minAmount/maxAmount jamais appliqués.
 */

function makeYear(year: number, propertyLevelCashFlow: number): YearContext {
  return {
    year,
    prixNetVendeur: 3000000,
    coutTotal: 3200000,
    assetValue: 3400000,
    grossPotentialRent: 400000,
    noi: 300000,
    capitalCollecte: 1000000,
    propertyLevelCashFlow,
  };
}

const asOfDate = new Date('2026-01-01');

describe('computeStakeholderWaterfall — réconciliation générale', () => {
  it('ne distribue jamais plus que le pool disponible (regression : sur-distribution)', () => {
    // Deux tiers RESIDUAL_SPLIT au même ordre, sharePct cumulés à 150% (saisie invalide).
    const input: StakeholderWaterfallInput = {
      asOfDate,
      stakeholders: [
        { id: 'investor', role: 'INVESTOR', name: 'Investisseur', capitalEngaged: 1000000 },
        { id: 'sponsor', role: 'SPONSOR', name: 'Sponsor', capitalEngaged: 0 },
      ],
      feeDefinitions: [],
      tiers: [
        { id: 't1', beneficiaryStakeholderId: 'investor', order: 1, type: 'RESIDUAL_SPLIT', hurdleRatePct: null, catchUpPct: null, sharePct: 90 },
        { id: 't2', beneficiaryStakeholderId: 'sponsor', order: 1, type: 'RESIDUAL_SPLIT', hurdleRatePct: null, catchUpPct: null, sharePct: 60 },
      ],
      years: [makeYear(1, 100000)],
      netSaleProceeds: 0,
      plusValue: 0,
    };

    const result = computeStakeholderWaterfall(input);
    expect(result.reconciled).toBe(true);
    expect(Math.abs(result.unallocatedAmount)).toBeLessThan(1);

    const totalDistributed = result.stakeholders.reduce((sum, s) => sum + s.totalWaterfallIncome, 0);
    expect(totalDistributed).toBeCloseTo(100000, 2); // jamais 150 000 (1.5x le pool)

    // Normalisé proportionnellement : 90/150 et 60/150 du pool.
    const investor = result.stakeholders.find((s) => s.stakeholderId === 'investor')!;
    const sponsor = result.stakeholders.find((s) => s.stakeholderId === 'sponsor')!;
    expect(investor.totalWaterfallIncome).toBeCloseTo(60000, 2);
    expect(sponsor.totalWaterfallIncome).toBeCloseTo(40000, 2);
  });

  it('ne paie jamais le catch-up au-delà de son plafond cumulé (regression : double paiement)', () => {
    const input: StakeholderWaterfallInput = {
      asOfDate,
      stakeholders: [
        { id: 'investor', role: 'INVESTOR', name: 'Investisseur', capitalEngaged: 1000000 },
        { id: 'sponsor', role: 'SPONSOR', name: 'Sponsor', capitalEngaged: 0 },
      ],
      feeDefinitions: [],
      tiers: [
        { id: 't1', beneficiaryStakeholderId: 'investor', order: 1, type: 'PREFERRED_RETURN', hurdleRatePct: 8, catchUpPct: null, sharePct: null },
        { id: 't2', beneficiaryStakeholderId: 'sponsor', order: 2, type: 'CATCH_UP', hurdleRatePct: null, catchUpPct: 100, sharePct: null },
        { id: 't3', beneficiaryStakeholderId: 'investor', order: 3, type: 'RESIDUAL_SPLIT', hurdleRatePct: null, catchUpPct: null, sharePct: 80 },
        { id: 't4', beneficiaryStakeholderId: 'sponsor', order: 3, type: 'RESIDUAL_SPLIT', hurdleRatePct: null, catchUpPct: null, sharePct: 20 },
      ],
      // Plusieurs années : le bug se manifestait par une ré-accumulation du
      // catch-up cumulé chaque année au lieu du seul delta.
      years: [makeYear(1, 200000), makeYear(2, 200000), makeYear(3, 200000)],
      netSaleProceeds: 0,
      plusValue: 0,
    };

    const result = computeStakeholderWaterfall(input);
    const investor = result.stakeholders.find((s) => s.stakeholderId === 'investor')!;
    const sponsor = result.stakeholders.find((s) => s.stakeholderId === 'sponsor')!;

    const totalPreferredPaid = investor.receipts.filter((r) => r.category === 'PREFERRED_RETURN').reduce((sum, r) => sum + r.amount, 0);
    const totalCatchUpPaid = sponsor.receipts.filter((r) => r.category === 'CATCH_UP').reduce((sum, r) => sum + r.amount, 0);

    // Catch-up à 100% : jamais plus que le cumul du preferred déjà versé aux autres.
    expect(totalCatchUpPaid).toBeLessThanOrEqual(totalPreferredPaid + 0.01);
  });

  it('date les frais d\'entrée à t0 (année 0), pas à la première année d\'exploitation (regression : TRI faussé)', () => {
    const input: StakeholderWaterfallInput = {
      asOfDate,
      stakeholders: [{ id: 'sponsor', role: 'SPONSOR', name: 'Sponsor', capitalEngaged: 100000 }],
      feeDefinitions: [{ id: 'f1', stakeholderId: 'sponsor', feeType: 'ENTRY', ratePct: null, fixedAmount: 20000, calculationBase: 'AUTRE', startYear: null, endYear: null, minAmount: null, maxAmount: null }],
      tiers: [],
      years: [makeYear(1, 0)],
      netSaleProceeds: 150000,
      plusValue: 50000,
    };

    const result = computeStakeholderWaterfall(input);
    const sponsor = result.stakeholders.find((s) => s.stakeholderId === 'sponsor')!;
    const entryFeeReceipt = sponsor.receipts.find((r) => r.category === 'FEE' && r.amount === 20000);
    expect(entryFeeReceipt).toBeDefined();
    expect(entryFeeReceipt!.year).toBe(0);
  });

  it('applique minAmount/maxAmount aux frais (regression : plancher/plafond ignorés)', () => {
    const input: StakeholderWaterfallInput = {
      asOfDate,
      stakeholders: [{ id: 'manager', role: 'PROPERTY_MANAGER', name: 'Gestionnaire', capitalEngaged: null }],
      feeDefinitions: [
        // 1% de NOI (300000) = 3000, mais plancher contractuel à 10000.
        { id: 'f1', stakeholderId: 'manager', feeType: 'RUNNING', ratePct: 1, fixedAmount: null, calculationBase: 'NOI', startYear: null, endYear: null, minAmount: 10000, maxAmount: null },
      ],
      tiers: [],
      years: [makeYear(1, 500000)],
      netSaleProceeds: 0,
      plusValue: 0,
    };

    const result = computeStakeholderWaterfall(input);
    const manager = result.stakeholders.find((s) => s.stakeholderId === 'manager')!;
    expect(manager.totalFeeIncome).toBe(10000);
  });

  it('un stakeholder sans capital engagé n\'a pas de TRI (division par un capital nul non définie)', () => {
    const input: StakeholderWaterfallInput = {
      asOfDate,
      stakeholders: [{ id: 'advisor', role: 'ADVISOR', name: 'Conseil', capitalEngaged: null }],
      feeDefinitions: [{ id: 'f1', stakeholderId: 'advisor', feeType: 'RUNNING', ratePct: 1, fixedAmount: null, calculationBase: 'NOI', startYear: null, endYear: null, minAmount: null, maxAmount: null }],
      tiers: [],
      years: [makeYear(1, 500000)],
      netSaleProceeds: 0,
      plusValue: 0,
    };
    const result = computeStakeholderWaterfall(input);
    const advisor = result.stakeholders.find((s) => s.stakeholderId === 'advisor')!;
    expect(advisor.irrPct).toBeNull();
    expect(advisor.multiple).toBeNull();
  });
});
