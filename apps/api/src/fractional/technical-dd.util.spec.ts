import { computeTechnicalRiskRating, computeCapexPlanByHorizon, TECHNICAL_SUB_BLOCKS, type TechnicalAssessmentLike, type CapexItemLike } from './technical-dd.util';

describe('computeTechnicalRiskRating', () => {
  it('treats a sub-block with no recorded assessment as unassessed, never BON by default', () => {
    const result = computeTechnicalRiskRating([]);

    expect(result.unassessedCount).toBe(Object.keys(TECHNICAL_SUB_BLOCKS).length);
    expect(result.worstTier).toBeNull();
    expect(result.criticalCount).toBe(0);
    for (const block of result.subBlocks) {
      expect(block.tier).toBeNull();
    }
  });

  it('finds the worst tier among evaluated sub-blocks, ignoring unassessed ones', () => {
    const assessments: TechnicalAssessmentLike[] = [
      { subBlock: 'BATIMENT', tier: 'BON', conditionPrealable: false, notes: null },
      { subBlock: 'ETAT', tier: 'MAUVAIS', conditionPrealable: false, notes: null },
      { subBlock: 'CONFORMITE', tier: 'MOYEN', conditionPrealable: false, notes: null },
    ];

    const result = computeTechnicalRiskRating(assessments);

    expect(result.worstTier).toBe('MAUVAIS');
    expect(result.unassessedCount).toBe(Object.keys(TECHNICAL_SUB_BLOCKS).length - 3);
  });

  it('counts CRITIQUE sub-blocks and conditionPrealable flags separately, never merged into a single score', () => {
    const assessments: TechnicalAssessmentLike[] = [
      { subBlock: 'ENVIRONNEMENT', tier: 'CRITIQUE', conditionPrealable: true, notes: 'Pollution des sols avérée' },
      { subBlock: 'ASSURANCE', tier: 'CRITIQUE', conditionPrealable: false, notes: null },
      { subBlock: 'BATIMENT', tier: 'BON', conditionPrealable: true, notes: 'Levée administrative en cours' },
    ];

    const result = computeTechnicalRiskRating(assessments);

    expect(result.criticalCount).toBe(2);
    expect(result.conditionPrealableCount).toBe(2);
    expect(result.worstTier).toBe('CRITIQUE');
    const environnement = result.subBlocks.find((b) => b.subBlock === 'ENVIRONNEMENT')!;
    expect(environnement.notes).toBe('Pollution des sols avérée');
  });

  it('a fully-evaluated all-BON project has worstTier BON and zero critical/unassessed', () => {
    const assessments: TechnicalAssessmentLike[] = (Object.keys(TECHNICAL_SUB_BLOCKS) as Array<keyof typeof TECHNICAL_SUB_BLOCKS>).map((subBlock) => ({
      subBlock,
      tier: 'BON' as const,
      conditionPrealable: false,
      notes: null,
    }));

    const result = computeTechnicalRiskRating(assessments);

    expect(result.worstTier).toBe('BON');
    expect(result.unassessedCount).toBe(0);
    expect(result.criticalCount).toBe(0);
  });
});

describe('computeCapexPlanByHorizon', () => {
  it('buckets a CAPEX item due this year into ANS_0_1', () => {
    const items: CapexItemLike[] = [{ annee: 2026, montant: 50000, responsable: 'PROPRIETAIRE' }];
    const result = computeCapexPlanByHorizon(items, 2026);

    const bucket = result.find((b) => b.horizon === 'ANS_0_1')!;
    expect(bucket.proprietaireTotal).toBe(50000);
    expect(bucket.total).toBe(50000);
  });

  it('separates PROPRIETAIRE and LOCATAIRE totals within the same horizon', () => {
    const items: CapexItemLike[] = [
      { annee: 2028, montant: 30000, responsable: 'PROPRIETAIRE' },
      { annee: 2028, montant: 12000, responsable: 'LOCATAIRE' },
    ];
    const result = computeCapexPlanByHorizon(items, 2026);

    const bucket = result.find((b) => b.horizon === 'ANS_1_3')!;
    expect(bucket.proprietaireTotal).toBe(30000);
    expect(bucket.locataireTotal).toBe(12000);
    expect(bucket.total).toBe(42000);
  });

  it('bucket boundaries: exactly 3/5/10 years out falls in the nearer bucket, not the next', () => {
    const items: CapexItemLike[] = [
      { annee: 2029, montant: 1000, responsable: 'PROPRIETAIRE' }, // +3y
      { annee: 2031, montant: 2000, responsable: 'PROPRIETAIRE' }, // +5y
      { annee: 2036, montant: 3000, responsable: 'PROPRIETAIRE' }, // +10y
    ];
    const result = computeCapexPlanByHorizon(items, 2026);

    expect(result.find((b) => b.horizon === 'ANS_1_3')!.total).toBe(1000);
    expect(result.find((b) => b.horizon === 'ANS_3_5')!.total).toBe(2000);
    expect(result.find((b) => b.horizon === 'ANS_5_10')!.total).toBe(3000);
  });

  it('a CAPEX item beyond 10 years or in the past is bucketed as HORS_HORIZON, never silently dropped', () => {
    const items: CapexItemLike[] = [
      { annee: 2040, montant: 5000, responsable: 'PROPRIETAIRE' },
      { annee: 2020, montant: 7000, responsable: 'LOCATAIRE' },
    ];
    const result = computeCapexPlanByHorizon(items, 2026);

    const bucket = result.find((b) => b.horizon === 'HORS_HORIZON')!;
    expect(bucket.proprietaireTotal).toBe(5000);
    expect(bucket.locataireTotal).toBe(7000);
  });

  it('returns all 5 horizon buckets even with no CAPEX items, all zeroed', () => {
    const result = computeCapexPlanByHorizon([], 2026);

    expect(result).toHaveLength(5);
    for (const bucket of result) {
      expect(bucket.total).toBe(0);
    }
  });
});
