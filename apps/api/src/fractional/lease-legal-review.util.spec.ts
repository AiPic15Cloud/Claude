import { computeLeaseLegalReview, type LeaseLegalReviewInput } from './lease-legal-review.util';

const asOfDate = new Date('2026-01-01');

function makeInput(overrides: Partial<LeaseLegalReviewInput> = {}): LeaseLegalReviewInput {
  return {
    dateEffet: new Date('2020-01-01'),
    dateTerme: new Date('2032-01-01'),
    breakDates: [],
    statutRenouvellement: 'SIGNE',
    procedureCollective: false,
    impayesNotes: null,
    depotGarantieMontant: 10000,
    loyerFacialAnnuel: 120000,
    restrictionsCessionSousLocation: 'clause standard',
    repartitionTravaux: 'art. 606 a la charge du bailleur',
    sirenLocataire: '123456789',
    ...overrides,
  };
}

describe('computeLeaseLegalReview', () => {
  it('ne remonte aucune recommandation pour un bail complet, signe, loin de son echeance', () => {
    const result = computeLeaseLegalReview(makeInput(), asOfDate);
    expect(result.recommendations).toHaveLength(0);
    expect(result.worstSeverity).toBe('INFO');
  });

  it("signale en WATCH une echeance entre 1 et 2 ans (\"2 annees restantes\")", () => {
    const result = computeLeaseLegalReview(makeInput({ dateTerme: new Date('2028-01-01') }), asOfDate);
    const rec = result.recommendations.find((r) => r.code === 'EXPIRY_APPROACHING');
    expect(rec).toBeDefined();
    expect(rec!.severity).toBe('WATCH');
    expect(result.worstSeverity).toBe('WATCH');
  });

  it('signale en ALERT une echeance dans moins de 12 mois', () => {
    const result = computeLeaseLegalReview(makeInput({ dateTerme: new Date('2026-08-01') }), asOfDate);
    const rec = result.recommendations.find((r) => r.code === 'EXPIRY_IMMINENT');
    expect(rec).toBeDefined();
    expect(rec!.severity).toBe('ALERT');
  });

  it('signale en CRITIQUE une echeance deja depassee', () => {
    const result = computeLeaseLegalReview(makeInput({ dateTerme: new Date('2025-06-01') }), asOfDate);
    expect(result.recommendations.some((r) => r.code === 'EXPIRY_PASSED' && r.severity === 'CRITIQUE')).toBe(true);
    expect(result.worstSeverity).toBe('CRITIQUE');
  });

  it('priorise l\'option de sortie (break) sur le terme quand elle est plus proche', () => {
    const result = computeLeaseLegalReview(makeInput({ breakDates: [new Date('2026-06-01')] }), asOfDate);
    const rec = result.recommendations.find((r) => r.code === 'EXPIRY_IMMINENT');
    expect(rec).toBeDefined();
    expect(rec!.message).toContain('break');
    expect(result.recommendations.some((r) => r.code === 'BREAK_OPTION_IMMINENT')).toBe(true);
  });

  it('signale un bail "pas ferme" (renouvellement tacite) en WATCH', () => {
    const result = computeLeaseLegalReview(makeInput({ statutRenouvellement: 'TACITE' }), asOfDate);
    expect(result.recommendations.some((r) => r.code === 'RENEWAL_TACIT' && r.severity === 'WATCH')).toBe(true);
  });

  it('signale un renouvellement en cours (EN_COURS) en WATCH', () => {
    const result = computeLeaseLegalReview(makeInput({ statutRenouvellement: 'EN_COURS' }), asOfDate);
    expect(result.recommendations.some((r) => r.code === 'RENEWAL_IN_PROGRESS')).toBe(true);
  });

  it('signale un renouvellement depasse ou conteste en CRITIQUE', () => {
    const overdue = computeLeaseLegalReview(makeInput({ statutRenouvellement: 'DEPASSE' }), asOfDate);
    expect(overdue.recommendations.some((r) => r.code === 'RENEWAL_OVERDUE' && r.severity === 'CRITIQUE')).toBe(true);

    const contested = computeLeaseLegalReview(makeInput({ statutRenouvellement: 'CONTESTE' }), asOfDate);
    expect(contested.recommendations.some((r) => r.code === 'RENEWAL_CONTESTED' && r.severity === 'CRITIQUE')).toBe(true);
  });

  it('signale une procedure collective en CRITIQUE', () => {
    const result = computeLeaseLegalReview(makeInput({ procedureCollective: true }), asOfDate);
    expect(result.recommendations.some((r) => r.code === 'INSOLVENCY_PROCEEDING' && r.severity === 'CRITIQUE')).toBe(true);
    expect(result.worstSeverity).toBe('CRITIQUE');
  });

  it('signale des impayes documentes en ALERT', () => {
    const result = computeLeaseLegalReview(makeInput({ impayesNotes: 'retard de paiement de 2 mois' }), asOfDate);
    expect(result.recommendations.some((r) => r.code === 'UNPAID_RENT_HISTORY' && r.severity === 'ALERT')).toBe(true);
  });

  it('signale l\'absence de depot de garantie, et un depot insuffisant separement', () => {
    const noDeposit = computeLeaseLegalReview(makeInput({ depotGarantieMontant: null }), asOfDate);
    expect(noDeposit.recommendations.some((r) => r.code === 'NO_SECURITY_DEPOSIT')).toBe(true);

    const lowDeposit = computeLeaseLegalReview(makeInput({ depotGarantieMontant: 100, loyerFacialAnnuel: 120000 }), asOfDate);
    expect(lowDeposit.recommendations.some((r) => r.code === 'LOW_SECURITY_DEPOSIT')).toBe(true);
  });

  it('signale les clauses/champs administratifs non renseignes en INFO, sans faire monter worstSeverity au-dela d\'INFO seul', () => {
    const result = computeLeaseLegalReview(
      makeInput({ restrictionsCessionSousLocation: null, repartitionTravaux: null, sirenLocataire: null }),
      asOfDate,
    );
    expect(result.recommendations.filter((r) => r.severity === 'INFO')).toHaveLength(3);
    expect(result.worstSeverity).toBe('INFO');
  });

  it('worstSeverity remonte la severite maximale, meme melangee a des INFO', () => {
    const result = computeLeaseLegalReview(makeInput({ statutRenouvellement: 'TACITE', sirenLocataire: null }), asOfDate);
    expect(result.worstSeverity).toBe('WATCH');
  });
});
