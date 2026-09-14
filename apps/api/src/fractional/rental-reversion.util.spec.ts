import { computeLeaseReversion, computePortfolioReversion, type LeaseReversionInput } from './rental-reversion.util';

describe('computeLeaseReversion', () => {
  it("ERV non renseignée -> ERV_MISSING, jamais devinée à zéro ou 'au marché'", () => {
    const result = computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: null });
    expect(result.status).toBe('ERV_MISSING');
    expect(result.reversionPct).toBeNull();
  });

  it('ERV nettement en dessous du loyer facial -> OVER_RENTED (loyer au-dessus du marché)', () => {
    const result = computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 80000 });
    expect(result.status).toBe('OVER_RENTED');
    expect(result.reversionPct).toBeCloseTo(-20, 5);
  });

  it('ERV nettement au-dessus du loyer facial -> UNDER_RENTED (réserve de hausse)', () => {
    const result = computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 115000 });
    expect(result.status).toBe('UNDER_RENTED');
    expect(result.reversionPct).toBeCloseTo(15, 5);
  });

  it('ERV dans la bande de ±5% -> AT_MARKET', () => {
    expect(computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 103000 }).status).toBe('AT_MARKET');
    expect(computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 97000 }).status).toBe('AT_MARKET');
  });

  it('bande exactement à ±5% est encore AT_MARKET (seuil strict >, pas >=)', () => {
    expect(computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 105000 }).status).toBe('AT_MARKET');
    expect(computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 95000 }).status).toBe('AT_MARKET');
  });

  it('loyer facial nul -> ERV_MISSING (comparaison non significative), jamais une division par zéro silencieuse', () => {
    const result = computeLeaseReversion({ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 0, ervAnnuel: 50000 });
    expect(result.status).toBe('ERV_MISSING');
    expect(result.reversionPct).toBeNull();
  });
});

describe('computePortfolioReversion', () => {
  const leases: LeaseReversionInput[] = [
    { id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: 80000 }, // OVER_RENTED, -20%
    { id: 'l2', tenantName: 'B', loyerFacialAnnuel: 50000, ervAnnuel: 60000 }, // UNDER_RENTED, +20%
    { id: 'l3', tenantName: 'C', loyerFacialAnnuel: 30000, ervAnnuel: null }, // ERV_MISSING
  ];

  it('moyenne pondérée par le loyer, calculée uniquement sur les baux avec ERV connue', () => {
    const result = computePortfolioReversion(leases);
    // (100000*-20 + 50000*20) / (100000+50000) = (-2000000+1000000)/150000 = -6.666...
    expect(result.weightedReversionPct).toBeCloseTo(-6.6667, 3);
  });

  it('comptes par statut corrects', () => {
    const result = computePortfolioReversion(leases);
    expect(result.overRentedCount).toBe(1);
    expect(result.underRentedCount).toBe(1);
    expect(result.ervMissingCount).toBe(1);
    expect(result.atMarketCount).toBe(0);
    expect(result.totalCount).toBe(3);
  });

  it('rentPctErvMissing reflète la part du loyer total sans ERV, jamais masquée par la moyenne pondérée', () => {
    const result = computePortfolioReversion(leases);
    // 30000 / (100000+50000+30000) = 16.666...%
    expect(result.rentPctErvMissing).toBeCloseTo(16.6667, 3);
  });

  it('aucun bail avec ERV connue -> weightedReversionPct null, jamais 0 par défaut', () => {
    const result = computePortfolioReversion([{ id: 'l1', tenantName: 'A', loyerFacialAnnuel: 100000, ervAnnuel: null }]);
    expect(result.weightedReversionPct).toBeNull();
    expect(result.rentPctErvMissing).toBe(100);
  });

  it('portefeuille vide -> pas de division par zéro', () => {
    const result = computePortfolioReversion([]);
    expect(result.weightedReversionPct).toBeNull();
    expect(result.rentPctErvMissing).toBe(0);
    expect(result.totalCount).toBe(0);
  });
});
