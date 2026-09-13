import { computeDataConfidence, type CriticalFieldRef, type ProvenanceRecordLike } from './data-confidence.util';

const fields: CriticalFieldRef[] = [
  { entityType: 'PROJECT', entityId: 'p1', fieldKey: 'prixNetVendeur', label: 'Prix net vendeur' },
  { entityType: 'LEASE', entityId: 'l1', fieldKey: 'loyerFacialAnnuel', label: 'Loyer facial annuel' },
];

describe('computeDataConfidence', () => {
  it('un champ critique jamais sourcé compte 0, jamais une valeur masquée comme fiable', () => {
    const result = computeDataConfidence(fields, []);
    expect(result.missingCount).toBe(2);
    expect(result.scorePct).toBe(0);
    expect(result.fieldScores.every((f) => f.status === 'MISSING' && f.scorePct === 0)).toBe(true);
  });

  it('VERIFIED + HIGH sur tous les champs -> score 100', () => {
    const records: ProvenanceRecordLike[] = fields.map((f) => ({ ...f, verificationStatus: 'VERIFIED', confidence: 'HIGH' }));
    const result = computeDataConfidence(fields, records);
    expect(result.scorePct).toBe(100);
    expect(result.missingCount).toBe(0);
  });

  it('moyenne un champ verifie et un champ manquant', () => {
    const records: ProvenanceRecordLike[] = [{ ...fields[0], verificationStatus: 'VERIFIED', confidence: 'HIGH' }];
    const result = computeDataConfidence(fields, records);
    expect(result.scorePct).toBe(50); // (100 + 0) / 2
    expect(result.missingCount).toBe(1);
  });

  it('CONFLICTING penalise fortement quelle que soit la confiance affichee', () => {
    const records: ProvenanceRecordLike[] = fields.map((f) => ({ ...f, verificationStatus: 'CONFLICTING', confidence: 'HIGH' }));
    const result = computeDataConfidence(fields, records);
    expect(result.scorePct).toBe(10);
  });

  it('un enregistrement pour une entite/un champ different ne matche pas (cle exacte)', () => {
    const records: ProvenanceRecordLike[] = [{ entityType: 'LEASE', entityId: 'l2', fieldKey: 'loyerFacialAnnuel', verificationStatus: 'VERIFIED', confidence: 'HIGH' }];
    const result = computeDataConfidence(fields, records);
    expect(result.missingCount).toBe(2);
  });

  it('aucun champ critique -> score 0, pas de division par zero', () => {
    const result = computeDataConfidence([], []);
    expect(result).toEqual({ scorePct: 0, fieldScores: [], missingCount: 0, totalCount: 0 });
  });

  it.each([
    ['VERIFIED', 'HIGH', 100],
    ['VERIFIED', 'MEDIUM', 85],
    ['VERIFIED', 'LOW', 70],
    ['CROSS_CHECKED', 'HIGH', 80],
    ['CROSS_CHECKED', 'MEDIUM', 65],
    ['CROSS_CHECKED', 'LOW', 50],
    ['UNVERIFIED', 'HIGH', 50],
    ['UNVERIFIED', 'MEDIUM', 35],
    ['UNVERIFIED', 'LOW', 20],
    ['CONFLICTING', 'HIGH', 10],
  ] as const)('%s + %s -> %d points', (verificationStatus, confidence, expected) => {
    const single = [fields[0]];
    const result = computeDataConfidence(single, [{ ...single[0], verificationStatus, confidence }]);
    expect(result.scorePct).toBe(expected);
  });
});
