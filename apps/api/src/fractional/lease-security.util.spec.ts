import { computeLeaseSecurity, sumLoyerByStatuses, computeSecuredRentAtHorizon, type LeaseInput } from './lease-security.util';

const asOfDate = new Date('2026-01-01');

function makeLease(overrides: Partial<LeaseInput> & Pick<LeaseInput, 'id' | 'loyerFacialAnnuel'>): LeaseInput {
  return {
    tenantName: 'Locataire',
    dateEffet: new Date('2020-01-01'),
    dateTerme: new Date('2032-01-01'),
    breakDates: [],
    statutRenouvellement: 'SIGNE',
    indexation: 'AUTRE',
    indexationCapPct: null,
    indexationFloorPct: null,
    ...overrides,
  };
}

describe('computeLeaseSecurity', () => {
  it('classe SECURED un bail signe dont l\'echeance depasse l\'horizon de detention', () => {
    const result = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01') })],
      asOfDate,
      holdPeriodMonths: 60,
    });
    expect(result.assessments[0].securityStatus).toBe('SECURED');
  });

  it('classe EXCLUDE_FROM_SECURED_YIELD un bail dont l\'echeance est deja depassee', () => {
    const result = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2025-01-01') })],
      asOfDate,
    });
    expect(result.assessments[0].securityStatus).toBe('EXCLUDE_FROM_SECURED_YIELD');
  });

  it('classe EXCLUDE_FROM_SECURED_YIELD un bail au statut DEPASSE ou CONTESTE, meme avec une echeance lointaine', () => {
    const result = computeLeaseSecurity({
      leases: [
        makeLease({ id: 'l1', loyerFacialAnnuel: 100000, statutRenouvellement: 'CONTESTE', dateTerme: new Date('2036-01-01') }),
      ],
      asOfDate,
    });
    expect(result.assessments[0].securityStatus).toBe('EXCLUDE_FROM_SECURED_YIELD');
  });

  it('un bail materiel signe avec echeance dans l\'horizon devient WATCH (spec sec 7.2 : poids compte)', () => {
    // Un seul bail => poids 100%, forcement materiel.
    const result = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2027-06-01') })],
      asOfDate,
      holdPeriodMonths: 60,
      materialityThresholdPct: 5,
    });
    expect(result.assessments[0].securityStatus).toBe('WATCH');
  });

  it('un bail materiel non signe (EN_COURS) avec echeance dans l\'horizon devient SECURE_BEFORE_ACQUISITION', () => {
    const result = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, statutRenouvellement: 'EN_COURS', dateTerme: new Date('2027-06-01') })],
      asOfDate,
      holdPeriodMonths: 60,
    });
    expect(result.assessments[0].securityStatus).toBe('SECURE_BEFORE_ACQUISITION');
  });

  it('un covenant faible (< 40) aggrave le statut d\'un cran, jamais l\'inverse', () => {
    const withoutCovenant = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01') })],
      asOfDate,
    });
    expect(withoutCovenant.assessments[0].securityStatus).toBe('SECURED');

    const withWeakCovenant = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01'), covenantScore: 20 })],
      asOfDate,
    });
    expect(withWeakCovenant.assessments[0].securityStatus).toBe('WATCH');
    expect(withWeakCovenant.assessments[0].reasons.join(' ')).toContain('Covenant');
  });

  it('un covenant faible n\'aggrave jamais un bail deja EXCLUDE_FROM_SECURED_YIELD', () => {
    const result = computeLeaseSecurity({
      leases: [makeLease({ id: 'l1', loyerFacialAnnuel: 100000, statutRenouvellement: 'DEPASSE', covenantScore: 5 })],
      asOfDate,
    });
    expect(result.assessments[0].securityStatus).toBe('EXCLUDE_FROM_SECURED_YIELD');
  });

  it('pondere WALB/WALT par le loyer de chaque bail', () => {
    const result = computeLeaseSecurity({
      leases: [
        makeLease({ id: 'l1', loyerFacialAnnuel: 300000, dateTerme: new Date('2027-01-01') }), // ~1 an
        makeLease({ id: 'l2', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01') }), // ~10 ans
      ],
      asOfDate,
    });
    // Moyenne ponderee : (300000*1 + 100000*10) / 400000 = 3.25 ans environ
    expect(result.waltYears).not.toBeNull();
    expect(result.waltYears!).toBeGreaterThan(2);
    expect(result.waltYears!).toBeLessThan(4);
  });

  it('somme correctement les loyers par statut via sumLoyerByStatuses', () => {
    const leases = [
      makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01') }),
      makeLease({ id: 'l2', loyerFacialAnnuel: 50000, statutRenouvellement: 'DEPASSE' }),
    ];
    const result = computeLeaseSecurity({ leases, asOfDate });
    const securedOnly = sumLoyerByStatuses(leases, result.assessments, ['SECURED']);
    expect(securedOnly).toBe(100000);
  });

  it('computeSecuredRentAtHorizon exclut les baux dont l\'echeance ne survit pas a l\'horizon demande', () => {
    const leases = [
      makeLease({ id: 'l1', loyerFacialAnnuel: 100000, dateTerme: new Date('2036-01-01') }),
      makeLease({ id: 'l2', loyerFacialAnnuel: 50000, dateTerme: new Date('2026-06-01') }),
    ];
    const at36Months = computeSecuredRentAtHorizon({ leases, asOfDate }, 36);
    expect(at36Months).toBe(100000);
  });
});
