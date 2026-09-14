import {
  computeTenantReplacementCost,
  REFURBISHMENT_SHARE_PCT,
  BROKERAGE_FEE_SHARE_PCT,
  LEGAL_FEES_SHARE_PCT,
  LANDLORD_TI_SHARE_PCT,
  type TenantReplacementCostInput,
} from './tenant-replacement-cost.util';

const baseInput: TenantReplacementCostInput = {
  leaseId: 'l1',
  tenantName: 'Locataire Test',
  preBreakAnnualRent: 120000,
  vacancyMonths: 9,
  relettingCapexTotal: 100000,
  reletAnnualRent: 108000,
  opexPct: 15,
  chargesRecuperables: true,
};

describe('computeTenantReplacementCost', () => {
  it('vacancyLostRent = loyer mensuel × mois de vacance', () => {
    const result = computeTenantReplacementCost(baseInput);
    expect(result.vacancyLostRent).toBeCloseTo((120000 / 12) * 9, 6);
  });

  it('lostRecoverableCharges = vacancyLostRent × opexPct quand le bail est à charges récupérables', () => {
    const result = computeTenantReplacementCost(baseInput);
    const expectedVacancyLostRent = (120000 / 12) * 9;
    expect(result.lostRecoverableCharges).toBeCloseTo(expectedVacancyLostRent * 0.15, 6);
  });

  it("lostRecoverableCharges = 0 quand le bail n'est pas à charges récupérables (jamais un montant devine)", () => {
    const result = computeTenantReplacementCost({ ...baseInput, chargesRecuperables: false });
    expect(result.lostRecoverableCharges).toBe(0);
  });

  it('les 4 parts du CAPEX de relocation somment exactement au CAPEX total (aucune double comptabilisation)', () => {
    const result = computeTenantReplacementCost(baseInput);
    const sumOfShares = result.refurbishmentCost + result.brokerageFee + result.legalFees + result.landlordTiContribution;
    expect(sumOfShares).toBeCloseTo(baseInput.relettingCapexTotal, 6);
  });

  it('les parts nommées respectent les pourcentages exportés', () => {
    const result = computeTenantReplacementCost(baseInput);
    expect(result.refurbishmentCost).toBeCloseTo(baseInput.relettingCapexTotal * (REFURBISHMENT_SHARE_PCT / 100), 6);
    expect(result.brokerageFee).toBeCloseTo(baseInput.relettingCapexTotal * (BROKERAGE_FEE_SHARE_PCT / 100), 6);
    expect(result.legalFees).toBeCloseTo(baseInput.relettingCapexTotal * (LEGAL_FEES_SHARE_PCT / 100), 6);
    expect(result.landlordTiContribution).toBeCloseTo(baseInput.relettingCapexTotal * (LANDLORD_TI_SHARE_PCT / 100), 6);
  });

  it('totalEconomicCost = somme de toutes les lignes (vacance + charges + 4 parts du CAPEX)', () => {
    const result = computeTenantReplacementCost(baseInput);
    const expected = result.vacancyLostRent + result.lostRecoverableCharges + result.refurbishmentCost + result.brokerageFee + result.legalFees + result.landlordTiContribution;
    expect(result.totalEconomicCost).toBeCloseTo(expected, 6);
  });

  it('paybackYears = coût total / loyer de reloc annuel', () => {
    const result = computeTenantReplacementCost(baseInput);
    expect(result.paybackYears).toBeCloseTo(result.totalEconomicCost / 108000, 6);
  });

  it('paybackYears = null si le loyer de reloc est nul (jamais une division par zero silencieuse)', () => {
    const result = computeTenantReplacementCost({ ...baseInput, reletAnnualRent: 0 });
    expect(result.paybackYears).toBeNull();
  });

  it('CAPEX de relocation nul -> les 4 parts et le total restent cohérents (pas de NaN)', () => {
    const result = computeTenantReplacementCost({ ...baseInput, relettingCapexTotal: 0 });
    expect(result.refurbishmentCost).toBe(0);
    expect(result.brokerageFee).toBe(0);
    expect(result.legalFees).toBe(0);
    expect(result.landlordTiContribution).toBe(0);
    expect(result.totalEconomicCost).toBeCloseTo(result.vacancyLostRent + result.lostRecoverableCharges, 6);
  });
});
