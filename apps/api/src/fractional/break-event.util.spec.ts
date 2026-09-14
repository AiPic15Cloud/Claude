import {
  projectLeaseYearWithBreak,
  projectPortfolioWithBreaks,
  BREAK_DOWNSIDE_RELET_HAIRCUT_PCT,
  BREAK_DOWNSIDE_RELETTING_CAPEX_PCT_OF_RENT,
  type LeaseBreakInput,
} from './break-event.util';

const asOfDate = new Date('2026-01-01');

// Bail Action Saint-Étienne-like : break dans 2,5 ans, terme bien au-delà.
const leaseWithNearBreak: LeaseBreakInput = {
  loyerFacialAnnuel: 124617,
  indexation: 'AUTRE',
  indexationCapPct: null,
  indexationFloorPct: null,
  dateEffet: new Date('2020-01-01'),
  dateTerme: new Date('2035-01-01'),
  breakDates: [new Date('2028-07-01')], // ~2,5 ans après asOfDate
};

describe('projectLeaseYearWithBreak — BASE', () => {
  it('est identique a une simple composition indexee, quelle que soit la date de break (le locataire renouvelle)', () => {
    for (let year = 1; year <= 8; year++) {
      const { rent, relettingCapex, isPostRelet } = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, year, 'BASE');
      expect(rent).toBeCloseTo(124617 * Math.pow(1.015, year - 1), 6);
      expect(relettingCapex).toBe(0);
      expect(isPostRelet).toBe(false);
    }
  });
});

describe('projectLeaseYearWithBreak — DOWNSIDE', () => {
  it('annees avant le break : trajectoire normale, aucun CAPEX', () => {
    const y1 = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 1, 'DOWNSIDE');
    expect(y1.rent).toBeCloseTo(124617, 6);
    expect(y1.relettingCapex).toBe(0);
    expect(y1.isPostRelet).toBe(false);
  });

  it("annee du break : melange occupation/vacance/relocation, CAPEX de relocation genere", () => {
    const breakYearResult = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    // Break a 2,5 ans -> tombe en annee 3 (Math.ceil(30/12) = 3).
    expect(breakYearResult.relettingCapex).toBeGreaterThan(0);
    expect(breakYearResult.relettingCapex).toBeCloseTo((124617 * Math.pow(1.015, 2)) * (BREAK_DOWNSIDE_RELETTING_CAPEX_PCT_OF_RENT / 100), 2);
    // Loyer de l'annee du break < loyer plein (vacance + decote), mais > 0 (occupation partielle avant le break).
    expect(breakYearResult.rent).toBeGreaterThan(0);
    expect(breakYearResult.rent).toBeLessThan(124617 * Math.pow(1.015, 2));
    expect(breakYearResult.isPostRelet).toBe(true);
  });

  it('annees apres le break : loyer relet (decote) qui reprend sa propre indexation, aucun CAPEX recurrent', () => {
    // Vacance DOWNSIDE = 9 mois a partir du break (2,5 ans -> fin de vacance a 3,25 ans, donc relet a partir de l'annee 4).
    const postBreak = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 5, 'DOWNSIDE');
    const preBreakRentAtBreakYear = 124617 * Math.pow(1.015, 2); // annee 3
    const reletBase = preBreakRentAtBreakYear * (1 - BREAK_DOWNSIDE_RELET_HAIRCUT_PCT / 100);
    const expected = reletBase * Math.pow(1.015, 1); // 1 an apres le debut du relet (annee 5 - annee 4)
    expect(postBreak.rent).toBeCloseTo(expected, 2);
    expect(postBreak.relettingCapex).toBe(0);
    expect(postBreak.isPostRelet).toBe(true);
  });

  it('un bail sans break dans l\'horizon se comporte comme BASE', () => {
    const farLease: LeaseBreakInput = { ...leaseWithNearBreak, breakDates: [new Date('2040-01-01')] };
    const y4 = projectLeaseYearWithBreak(farLease, {}, 1.5, asOfDate, 4, 'DOWNSIDE');
    expect(y4.rent).toBeCloseTo(124617 * Math.pow(1.015, 3), 6);
    expect(y4.relettingCapex).toBe(0);
  });
});

describe('projectLeaseYearWithBreak — ERV réelle (rental-reversion.util.ts) vs proxy générique', () => {
  it('sans ERV renseignée : repli exact sur le proxy générique (comportement historique inchangé)', () => {
    const withoutErv = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 5, 'DOWNSIDE');
    const preBreakRentAtBreakYear = 124617 * Math.pow(1.015, 2);
    const reletBase = preBreakRentAtBreakYear * (1 - BREAK_DOWNSIDE_RELET_HAIRCUT_PCT / 100);
    const expected = reletBase * Math.pow(1.015, 1);
    expect(withoutErv.rent).toBeCloseTo(expected, 2);
  });

  it('avec ERV renseignée : la reloc part de l\'ERV (grandie au même taux jusqu\'à l\'année du break), pas du loyer facial sortant', () => {
    const leaseWithErv: LeaseBreakInput = { ...leaseWithNearBreak, ervAnnuel: 150000 };
    const withErv = projectLeaseYearWithBreak(leaseWithErv, {}, 1.5, asOfDate, 5, 'DOWNSIDE');
    const ervAtBreakYear = 150000 * Math.pow(1.015, 2); // année 3 = année du break
    const reletBase = ervAtBreakYear * (1 - BREAK_DOWNSIDE_RELET_HAIRCUT_PCT / 100);
    const expected = reletBase * Math.pow(1.015, 1);
    expect(withErv.rent).toBeCloseTo(expected, 2);
    // Confirme que ce n'est pas juste le proxy générique par coïncidence.
    const withoutErv = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 5, 'DOWNSIDE');
    expect(withErv.rent).not.toBeCloseTo(withoutErv.rent, 2);
  });

  it('ERV très en dessous du loyer facial (bail sur-loué) : la reloc post-break est bien inférieure à la trajectoire indexée pré-break', () => {
    const leaseOverRented: LeaseBreakInput = { ...leaseWithNearBreak, ervAnnuel: 60000 };
    const postBreak = projectLeaseYearWithBreak(leaseOverRented, {}, 1.5, asOfDate, 6, 'DOWNSIDE');
    const facialTrajectoryYear6 = 124617 * Math.pow(1.015, 5);
    expect(postBreak.rent).toBeLessThan(facialTrajectoryYear6 * 0.6);
  });

  it("le CAPEX de relocation reste base sur le loyer facial sortant, pas sur l'ERV (magnitude physique de travaux, pas de marche)", () => {
    const withErv = projectLeaseYearWithBreak({ ...leaseWithNearBreak, ervAnnuel: 300000 }, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    const withoutErv = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    expect(withErv.relettingCapex).toBeCloseTo(withoutErv.relettingCapex, 6);
  });
});

describe('projectLeaseYearWithBreak — SEVERE vs DOWNSIDE', () => {
  it("annee du break : meme mois de bascule pour les deux (vacance minimale de 9/18 mois deborde deja l'annee), le CAPEX de relocation differe deja", () => {
    const downside = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    const severe = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 3, 'SEVERE');
    expect(severe.relettingCapex).toBeGreaterThan(downside.relettingCapex);
  });

  it("annee suivante : la vacance plus longue de SEVERE (18 mois) laisse le bail encore vide quand DOWNSIDE (9 mois) est deja reloue", () => {
    const downside = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 4, 'DOWNSIDE');
    const severe = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 4, 'SEVERE');
    expect(downside.rent).toBeGreaterThan(1000);
    expect(severe.rent).toBeLessThan(500); // quasi-nul : encore vacant sur la quasi-totalite de l'annee
  });

  it('une fois toutes deux relouees, SEVERE reste en dessous de DOWNSIDE (decote de relocation plus forte)', () => {
    const downside = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 6, 'DOWNSIDE');
    const severe = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 6, 'SEVERE');
    expect(severe.rent).toBeLessThan(downside.rent);
  });
});

describe('projectPortfolioWithBreaks', () => {
  it('somme le loyer et le CAPEX de relocation sur plusieurs baux', () => {
    const stableLease: LeaseBreakInput = { ...leaseWithNearBreak, loyerFacialAnnuel: 50000, breakDates: [new Date('2040-01-01')] };
    const result = projectPortfolioWithBreaks([leaseWithNearBreak, stableLease], {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    const leaseAlone = projectLeaseYearWithBreak(leaseWithNearBreak, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    const stableAlone = projectLeaseYearWithBreak(stableLease, {}, 1.5, asOfDate, 3, 'DOWNSIDE');
    expect(result.grossPotentialRent).toBeCloseTo(leaseAlone.rent + stableAlone.rent, 6);
    expect(result.relettingCapex).toBeCloseTo(leaseAlone.relettingCapex + stableAlone.relettingCapex, 6);
  });
});
