import { computePlatformComparison, type PlatformComparisonCandidateInput } from './platform-comparison.util';

function makeCandidate(overrides: Partial<PlatformComparisonCandidateInput> = {}): PlatformComparisonCandidateInput {
  return {
    id: 'c1',
    status: 'CONTACTE',
    platformProfile: {
      id: 'p1',
      platformName: 'Plateforme A',
      minNetInvestorYieldPct: 6.5,
      targetHoldPeriodMonths: 60,
      acquisitionFeePct: 2,
      annualManagementFeePct: 1,
      incomeShareInvestorPct: 90,
      capitalGainShareInvestorPct: 80,
    },
    offerSummary: null,
    rejectionReason: null,
    comparedCriteria: null,
    ...overrides,
  };
}

describe('computePlatformComparison — spec Cockpit/Fractionné P2 §5.3', () => {
  it('produit une ligne par critère fixe, une valeur par candidature, dans le même ordre', () => {
    const a = makeCandidate({ id: 'a', platformProfile: { ...makeCandidate().platformProfile, platformName: 'Plateforme A' } });
    const b = makeCandidate({ id: 'b', platformProfile: { ...makeCandidate().platformProfile, platformName: 'Plateforme B', minNetInvestorYieldPct: 7 } });

    const result = computePlatformComparison([a, b]);

    expect(result.candidateIds).toEqual(['a', 'b']);
    expect(result.candidateLabels).toEqual(['Plateforme A', 'Plateforme B']);
    const hurdleRow = result.rows.find((r) => r.key === 'hurdle')!;
    expect(hurdleRow.values).toEqual(['6.5 %', '7 %']);
  });

  it("un critère négocié comparé pour une seule candidature apparaît quand même pour toutes, à confirmer (null) pour les autres", () => {
    const a = makeCandidate({ id: 'a', comparedCriteria: { assetTypeAccepted: 'Commerce' } });
    const b = makeCandidate({ id: 'b', comparedCriteria: null });

    const result = computePlatformComparison([a, b]);
    const row = result.rows.find((r) => r.key === 'criteria.assetTypeAccepted')!;

    expect(row.values).toEqual(['Commerce', null]);
  });

  it("n'invente jamais un critère négocié qu'aucune candidature n'a comparé", () => {
    const a = makeCandidate({ id: 'a', comparedCriteria: { minSurface: 200 } });
    const result = computePlatformComparison([a]);

    expect(result.rows.some((r) => r.key === 'criteria.maxSurface')).toBe(false);
  });

  it('une liste vide de candidatures produit une matrice vide, pas une erreur', () => {
    const result = computePlatformComparison([]);
    expect(result.candidateIds).toEqual([]);
    expect(result.rows.every((r) => r.values.length === 0)).toBe(true);
  });
});
