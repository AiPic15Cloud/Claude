import { computeMarketStudy, type PrequalMarketStudyInput } from './prequal-market-study.util';

function input(overrides: Partial<PrequalMarketStudyInput> = {}): PrequalMarketStudyInput {
  return {
    source: 'DVF (Etalab/DGFiP)',
    commune: 'Villeurbanne',
    transactions: [],
    prixSortiePondereParM2: null,
    coutDeRevient: null,
    pointMortAuM2: null,
    otherRevenueRetained: null,
    targetMarginPct: null,
    totalSurfaceSqm: 0,
    lotCount: 0,
    ...overrides,
  };
}

const TX = (pricePerSqm: number, date: string, price = pricePerSqm * 50) => ({ pricePerSqm, price, date });

describe('computeMarketStudy', () => {
  it('retourne des statistiques null sans transaction (Unknown ≠ Zero)', () => {
    const study = computeMarketStudy(input());
    expect(study.population.median).toBeNull();
    expect(study.population.count).toBe(0);
    expect(study.liquidity.echantillonTropFaible).toBe(true);
  });

  it('calcule médiane/moyenne/quartiles/min/max sur un échantillon simple', () => {
    const transactions = [1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000].map((p, i) => TX(p, `2025-0${(i % 9) + 1}-01`));
    const study = computeMarketStudy(input({ transactions }));
    expect(study.population.count).toBe(8);
    expect(study.population.min).toBe(1000);
    expect(study.population.max).toBe(8000);
    expect(study.population.median).toBe(4500);
    expect(study.population.average).toBe(4500);
  });

  it('signale un échantillon trop faible sous le seuil minimal', () => {
    const transactions = [1000, 2000].map((p, i) => TX(p, `2025-0${i + 1}-01`));
    const study = computeMarketStudy(input({ transactions }));
    expect(study.liquidity.echantillonTropFaible).toBe(true);
  });

  it("calcule l'écart à la médiane et le rang percentile du prix de sortie", () => {
    const transactions = Array.from({ length: 10 }, (_, i) => TX(1000 * (i + 1), `2025-01-0${(i % 9) + 1}`));
    const study = computeMarketStudy(input({ transactions, prixSortiePondereParM2: 5500 }));
    expect(study.positioning.ecartMedianePct).toBeCloseTo(0, 1);
    expect(study.positioning.percentileRank).toBe(50);
  });

  it('reste null sans prix de sortie renseigné (jamais un écart inventé)', () => {
    const transactions = [TX(1000, '2025-01-01')];
    const study = computeMarketStudy(input({ transactions }));
    expect(study.positioning.ecartMedianePct).toBeNull();
    expect(study.positioning.percentileRank).toBeNull();
  });

  it('calcule la marge si vente à la médiane à partir du coût de revient et de la surface totale', () => {
    const transactions = [TX(2000, '2025-01-01'), TX(2000, '2025-02-01')];
    const study = computeMarketStudy(input({ transactions, coutDeRevient: 150_000, totalSurfaceSqm: 100 }));
    // médiane = 2000, CA = 2000*100 = 200000, marge = 200000-150000 = 50000
    expect(study.positioning.margeSiVenteMediane).toBe(50_000);
    expect(study.positioning.margeSiVenteMedianePct).toBe(25);
  });

  it('calcule le prix minimal au m² pour atteindre la marge cible', () => {
    const study = computeMarketStudy(input({ coutDeRevient: 150_000, totalSurfaceSqm: 100, targetMarginPct: 25 }));
    // CA nécessaire = 150000 / (1-0.25) = 200000 -> 2000/m²
    expect(study.positioning.prixMinimalPourMargeCibleParM2).toBe(2000);
  });

  it('calcule la durée théorique d’écoulement à partir des ventes par mois et du nombre de lots', () => {
    const transactions = [TX(1000, '2025-01-01'), TX(1000, '2025-02-01'), TX(1000, '2025-03-01')];
    const study = computeMarketStudy(input({ transactions, lotCount: 3 }));
    expect(study.liquidity.ventesComparablesSurPeriode).toBe(3);
    expect(study.liquidity.dureeTheoriqueEcoulementMois).not.toBeNull();
  });
});
