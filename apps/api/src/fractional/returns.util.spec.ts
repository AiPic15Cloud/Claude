import { computeReturnsEngine, type ReturnsEngineInput } from './returns.util';
import type { LeaseInput } from './lease-security.util';

const asOfDate = new Date('2026-01-01');

function makeBaseInput(overrides: Partial<ReturnsEngineInput> = {}, leaseOverrides: Partial<LeaseInput> = {}): ReturnsEngineInput {
  const leases: LeaseInput[] = [
    {
      id: 'l1',
      tenantName: 'Locataire',
      loyerFacialAnnuel: 100000,
      dateEffet: new Date('2020-01-01'),
      dateTerme: new Date('2032-01-01'),
      breakDates: [],
      statutRenouvellement: 'SIGNE',
      indexation: 'AUTRE',
      indexationCapPct: null,
      indexationFloorPct: null,
      ...leaseOverrides,
    },
  ];

  return {
    asOfDate,
    sourcesUses: {
      prixNetVendeur: 1000000,
      droitsNotaire: 0,
      honoraires: 0,
      travauxInitiaux: 0,
      capexDiffereReserve: 0,
      fraisPlateformeEntree: 0,
      reserveVacance: 0,
      reserveTravaux: 0,
      reserveTresorerie: 0,
      collecteMontant: 1000000,
      sponsorEquity: 0,
      detteEventuelle: 0,
      autresSources: 0,
    },
    leases,
    holdPeriodYears: 5,
    vacancyCreditLossPct: 0,
    opexPct: 0,
    annualManagementFeePct: 0,
    incomeShareInvestorPct: 100,
    capitalGainShareInvestorPct: 100,
    rentGrowthPctPerYear: 1.5,
    exitValue: 1000000,
    sellingCostsPct: 0,
    ...overrides,
  };
}

describe('computeReturnsEngine — breakScenario (Break Event Engine, spec V2 §9)', () => {
  // Cas "Action Saint-Étienne" : hold period 8 ans, break à 2,5 ans (WALB
  // court), reproduit la contradiction signalée — WALB 2,5 ans affiché mais
  // cash-flow qui continuait tout droit sur 8 ans sans rupture ni CAPEX.
  const actionLikeInput = makeBaseInput(
    { holdPeriodYears: 8 },
    { loyerFacialAnnuel: 124617, dateTerme: new Date('2040-01-01'), breakDates: [new Date('2028-07-01')] },
  );

  it("BASE reste identique a l'ancien comportement (aucun break modelise) : loyer plein sur les 8 annees", () => {
    const result = computeReturnsEngine(actionLikeInput);
    expect(result.breakScenario).toBe('BASE');
    for (const y of result.yearlyModel) {
      expect(y.grossPotentialRent).toBeCloseTo(124617 * Math.pow(1.015, y.year - 1), 4);
      expect(y.capex).toBe(0);
    }
  });

  it('DOWNSIDE fait apparaitre une rupture reelle a l\'echeance du break : NOI en baisse et CAPEX de relocation, plus IRR degrade vs BASE', () => {
    const base = computeReturnsEngine(actionLikeInput);
    const downside = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'DOWNSIDE' });

    // L'annee du break (annee 3) porte desormais un CAPEX de relocation — absent en BASE.
    const breakYearDownside = downside.yearlyModel[2];
    expect(breakYearDownside.capex).toBeGreaterThan(0);
    expect(breakYearDownside.grossPotentialRent).toBeLessThan(base.yearlyModel[2].grossPotentialRent);

    // Le TRI degrade reflete la perte de revenu + le CAPEX, pas seulement le loyer facial.
    expect(downside.irrPct).not.toBeNull();
    expect(base.irrPct).not.toBeNull();
    expect(downside.irrPct as number).toBeLessThan(base.irrPct as number);
  });

  it('SEVERE degrade davantage que DOWNSIDE (vacance plus longue + decote plus forte + CAPEX plus eleve)', () => {
    const downside = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'DOWNSIDE' });
    const severe = computeReturnsEngine({ ...actionLikeInput, breakScenario: 'SEVERE' });
    expect(severe.irrPct as number).toBeLessThan(downside.irrPct as number);
    expect(severe.yearlyModel[2].capex).toBeGreaterThan(downside.yearlyModel[2].capex);
  });
});

describe('computeReturnsEngine — TVA (Complément H, H.3)', () => {
  it("MARGE/NON_ASSUJETTI ne changent rien au TRI — pas d'événement de trésorerie", () => {
    const base = computeReturnsEngine(makeBaseInput());
    const marge = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'MARGE', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(marge.irrPct).toBeCloseTo(base.irrPct as number, 6);
    expect(marge.irrImpactFromTvaTimingPts).toBeNull();
  });

  it('PRIX_TOTAL_OPTION_LOYERS dégrade le TRI (décaissement à t=0, récupération plus tard) — impact négatif renseigné', () => {
    const base = computeReturnsEngine(makeBaseInput());
    const withTva = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(withTva.irrPct as number).toBeLessThan(base.irrPct as number);
    expect(withTva.irrImpactFromTvaTimingPts).not.toBeNull();
    expect(withTva.irrImpactFromTvaTimingPts as number).toBeLessThan(0);
  });

  it('un délai de récupération plus long dégrade davantage le TRI qu\'un délai court', () => {
    const short = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    const long = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 14 } }));
    expect(long.irrPct as number).toBeLessThan(short.irrPct as number);
  });

  it("le multiple d'equity reste inchangé — le net de TVA est nul à terme, seul le TRI (timing) bouge", () => {
    const base = computeReturnsEngine(makeBaseInput());
    const withTva = computeReturnsEngine(makeBaseInput({ tva: { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', tauxPct: 20, recuperationDelaiMois: 3 } }));
    expect(withTva.equityMultiple).toBeCloseTo(base.equityMultiple as number, 6);
  });
});

describe('computeReturnsEngine', () => {
  it('calcule un Gross Yield cohérent (loyer / prix net vendeur)', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.grossYieldPct).toBeCloseTo(10, 6); // 100000 / 1000000
  });

  it('la première année de projection est toujours égale au loyer facial, quel que soit le taux de croissance', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.yearlyModel[0].grossPotentialRent).toBeCloseTo(100000, 6);
  });

  it('sans série de marché disponible, retombe sur la croissance de repli (AssumptionSet)', () => {
    const result = computeReturnsEngine(makeBaseInput());
    const expectedYear5 = 100000 * Math.pow(1.015, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('un bail indexé sur un indice avec série de marché connue utilise ce taux plutôt que la croissance de repli', () => {
    const result = computeReturnsEngine(makeBaseInput({ indexGrowthRates: { ILC: 4.5 } }, { indexation: 'ILC' }));
    const expectedYear5 = 100000 * Math.pow(1.045, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('un plafond contractuel d\'indexation borne la croissance appliquée', () => {
    const result = computeReturnsEngine(makeBaseInput({ indexGrowthRates: { ILC: 10 } }, { indexation: 'ILC', indexationCapPct: 3 }));
    const expectedYear5 = 100000 * Math.pow(1.03, 4);
    expect(result.yearlyModel[4].grossPotentialRent).toBeCloseTo(expectedYear5, 4);
  });

  it('renvoie un TRI et un multiple définis pour un cas simple rentable', () => {
    const result = computeReturnsEngine(makeBaseInput());
    expect(result.irrPct).not.toBeNull();
    expect(result.equityMultiple).not.toBeNull();
    expect(result.equityMultiple!).toBeGreaterThan(0);
  });
});
