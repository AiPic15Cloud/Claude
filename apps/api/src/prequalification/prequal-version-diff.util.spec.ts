import { diffPrequalVersions } from './prequal-version-diff.util';

describe('diffPrequalVersions', () => {
  it('flags orientation change and financial deltas', () => {
    const snapshotA = {
      orientation: 'WAIT',
      financial: { amountRequested: 500000, margeRecalculee: -50000 },
      findings: [{ severity: 'BLOCKING' }, { severity: 'WATCH' }],
      people: [{}],
      companies: [{}],
      lots: [{}],
      documents: [],
    };
    const snapshotB = {
      orientation: 'GO',
      financial: { amountRequested: 500000, margeRecalculee: 20000 },
      findings: [{ severity: 'WATCH' }],
      people: [{}],
      companies: [{}],
      lots: [{}, {}],
      documents: [{}],
    };

    const diff = diffPrequalVersions(1, snapshotA, 2, snapshotB);

    expect(diff.orientationChanged).toBe(true);
    expect(diff.orientationA).toBe('WAIT');
    expect(diff.orientationB).toBe('GO');
    expect(diff.financialChanges).toEqual([{ field: 'margeRecalculee', before: -50000, after: 20000 }]);
    expect(diff.findingsCountA.BLOCKING).toBe(1);
    expect(diff.findingsCountB.BLOCKING).toBe(0);
    expect(diff.lotsCountB - diff.lotsCountA).toBe(1);
    expect(diff.documentsCountB - diff.documentsCountA).toBe(1);
  });

  it('reports no changes for identical snapshots', () => {
    const snapshot = { orientation: 'GO', financial: { amountRequested: 100 }, findings: [], people: [], companies: [], lots: [], documents: [] };
    const diff = diffPrequalVersions(1, snapshot, 2, snapshot);
    expect(diff.orientationChanged).toBe(false);
    expect(diff.financialChanges).toEqual([]);
  });

  it('treats a field present only on one side as a change, never conflated with 0', () => {
    const snapshotA = { financial: { besoinMaxFinancement: null } };
    const snapshotB = { financial: { besoinMaxFinancement: 0 } };
    const diff = diffPrequalVersions(1, snapshotA, 2, snapshotB);
    expect(diff.financialChanges).toEqual([{ field: 'besoinMaxFinancement', before: null, after: 0 }]);
  });
});
