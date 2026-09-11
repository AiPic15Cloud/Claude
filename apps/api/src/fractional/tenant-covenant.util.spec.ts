import { computeTenantCovenantScore, type TenantCovenantInput } from './tenant-covenant.util';

function makeInput(overrides: Partial<TenantCovenantInput> = {}): TenantCovenantInput {
  return {
    sirenLocataire: '123456789',
    procedureCollective: false,
    garantieMaisonMere: false,
    statutRenouvellement: 'SIGNE',
    depotGarantieMontant: null,
    loyerFacialAnnuel: 100000,
    impayesNotes: null,
    caLocataireAnnuel: null,
    ebitdaLocataireAnnuel: null,
    tresorerieLocataire: null,
    ...overrides,
  };
}

describe('computeTenantCovenantScore', () => {
  it('renvoie le score de base (70) quand rien n\'aggrave ni n\'ameliore', () => {
    const result = computeTenantCovenantScore(makeInput());
    expect(result.score).toBe(70);
    expect(result.reasons).toHaveLength(0);
  });

  it('penalise fortement une procedure collective en cours', () => {
    const result = computeTenantCovenantScore(makeInput({ procedureCollective: true }));
    expect(result.score).toBe(20);
  });

  it('bonifie une garantie maison mere', () => {
    const result = computeTenantCovenantScore(makeInput({ garantieMaisonMere: true }));
    expect(result.score).toBe(85);
  });

  it('ne descend jamais sous 0 ni ne depasse 100', () => {
    const worst = computeTenantCovenantScore(
      makeInput({ procedureCollective: true, impayesNotes: 'gros retard', statutRenouvellement: 'CONTESTE', ebitdaLocataireAnnuel: -50000, tresorerieLocataire: 0, caLocataireAnnuel: 100000 }),
    );
    expect(worst.score).toBeGreaterThanOrEqual(0);

    const best = computeTenantCovenantScore(makeInput({ garantieMaisonMere: true, depotGarantieMontant: 50000, ebitdaLocataireAnnuel: 800000, tresorerieLocataire: 500000, caLocataireAnnuel: 5000000 }));
    expect(best.score).toBeLessThanOrEqual(100);
  });

  it('bloc Financier : reste neutre si CA/EBITDA/tresorerie sont absents', () => {
    const withData = computeTenantCovenantScore(makeInput());
    const withoutData = computeTenantCovenantScore(makeInput({ caLocataireAnnuel: null, ebitdaLocataireAnnuel: null, tresorerieLocataire: null }));
    expect(withData.score).toBe(withoutData.score);
  });

  it('bloc Financier : penalise un loyer representant plus de 15% du CA du locataire', () => {
    const result = computeTenantCovenantScore(makeInput({ caLocataireAnnuel: 500000, loyerFacialAnnuel: 100000 })); // 20%
    expect(result.score).toBeLessThan(70);
    expect(result.reasons.some((r) => r.includes('CA'))).toBe(true);
  });

  it('bloc Financier : penalise fortement un EBITDA negatif', () => {
    const result = computeTenantCovenantScore(makeInput({ ebitdaLocataireAnnuel: -10000 }));
    expect(result.score).toBe(45); // 70 - 25
  });

  it('bloc Financier : penalise une couverture EBITDA/loyer inferieure a 1x', () => {
    const result = computeTenantCovenantScore(makeInput({ ebitdaLocataireAnnuel: 50000, loyerFacialAnnuel: 100000 }));
    expect(result.score).toBe(50); // 70 - 20
  });

  it('bloc Financier : bonifie une couverture EBITDA/loyer confortable (>= 4x)', () => {
    const result = computeTenantCovenantScore(makeInput({ ebitdaLocataireAnnuel: 500000, loyerFacialAnnuel: 100000 }));
    expect(result.score).toBe(75); // 70 + 5
  });

  it('bloc Financier : penalise une tresorerie inferieure a un trimestre de loyer', () => {
    const result = computeTenantCovenantScore(makeInput({ tresorerieLocataire: 1000, loyerFacialAnnuel: 100000 }));
    expect(result.score).toBe(60); // 70 - 10
  });

  it('signale l\'absence de SIREN sans penaliser le score', () => {
    const withSiren = computeTenantCovenantScore(makeInput());
    const withoutSiren = computeTenantCovenantScore(makeInput({ sirenLocataire: null }));
    expect(withoutSiren.score).toBe(withSiren.score);
    expect(withoutSiren.reasons.some((r) => r.includes('SIREN'))).toBe(true);
  });
});
