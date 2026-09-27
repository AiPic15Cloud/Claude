import { computeCrd, computeCrdDetailed, sumRealizedRepayments } from './crd.util';

describe('computeCrd', () => {
  it('soustrait les remboursements réalisés du capital emprunté', () => {
    expect(computeCrd(100000, 30000)).toBe(70000);
  });

  it('plafonne à 0 — jamais un CRD négatif', () => {
    expect(computeCrd(100000, 150000)).toBe(0);
  });
});

describe('sumRealizedRepayments', () => {
  it('ignore les remboursements projetés (prévisions, pas des faits)', () => {
    const total = sumRealizedRepayments([
      { amount: 1000, projected: false },
      { amount: 5000, projected: true },
      { amount: 2000, projected: false },
    ]);
    expect(total).toBe(3000);
  });
});

describe('computeCrdDetailed', () => {
  const startDate = new Date('2026-01-01T00:00:00Z');

  it("intérêts courus non calculables (jamais fabriqués à 0) quand le taux manque", () => {
    const result = computeCrdDetailed(100000, null, startDate, [{ date: new Date('2026-02-10'), amount: 2000 }]);
    expect(result.crdCapital).toBe(98000);
    expect(result.crdInteretsCourus).toBeNull();
    expect(result.crdTotal).toBeNull();
    expect(result.joursPenalisesRetard).toBeNull();
  });

  it("intérêts courus non calculables quand la date de déblocage manque", () => {
    const result = computeCrdDetailed(100000, 12, null, [{ date: new Date('2026-02-10'), amount: 2000 }]);
    expect(result.crdCapital).toBe(98000);
    expect(result.crdInteretsCourus).toBeNull();
  });

  it('un remboursement sans ventilation est imputé en priorité sur les intérêts courus, puis sur le capital', () => {
    // 40 jours à 12%/an sur 100 000 € : intérêts courus = 100000 × 0,12 × 40/365 ≈ 1315,07 €
    const repaymentDate = new Date('2026-02-10T00:00:00Z');
    const result = computeCrdDetailed(100000, 12, startDate, [{ date: repaymentDate, amount: 2000 }], repaymentDate);

    expect(result.crdCapital).toBeCloseTo(99315.07, 2);
    expect(result.crdInteretsCourus).toBeCloseTo(0, 2);
    expect(result.crdTotal).toBeCloseTo(99315.07, 2);
  });

  it("une ventilation réelle (principalAmount/interestAmount) prime sur l'imputation par défaut", () => {
    const repaymentDate = new Date('2026-02-10T00:00:00Z');
    const result = computeCrdDetailed(
      100000,
      12,
      startDate,
      [{ date: repaymentDate, amount: 2000, principalAmount: 1800, interestAmount: 200 }],
      repaymentDate,
    );

    // Le capital baisse exactement de la part réelle (1800), pas de la part imputée (≈684,93) —
    // et l'écart entre intérêt réellement encaissé (200) et intérêt théoriquement couru (≈1315,07)
    // devient un arriéré d'intérêts, jamais perdu.
    expect(result.crdCapital).toBeCloseTo(98200, 2);
    expect(result.crdInteretsCourus).toBeCloseTo(1115.07, 2);
    // Sur un remboursement isolé, le total (capital + intérêts) ne dépend que du cash réellement
    // versé, pas de sa ventilation — même crdTotal que le scénario imputé ci-dessus (99315,07 €).
    expect(result.crdTotal).toBeCloseTo(99315.07, 2);
  });

  it("une ventilation partielle (un seul des deux champs) est traitée comme absente — jamais un mélange bancal", () => {
    const repaymentDate = new Date('2026-02-10T00:00:00Z');
    const result = computeCrdDetailed(
      100000,
      12,
      startDate,
      [{ date: repaymentDate, amount: 2000, interestAmount: 200, principalAmount: null }],
      repaymentDate,
    );

    // Retombe sur l'imputation par défaut, identique au test "sans ventilation" ci-dessus.
    expect(result.crdCapital).toBeCloseTo(99315.07, 2);
  });

  it("un paiement d'intérêts réel supérieur à l'intérêt théorique couru ne rend jamais l'arriéré négatif", () => {
    const repaymentDate = new Date('2026-01-11T00:00:00Z'); // 10 jours après le déblocage
    const result = computeCrdDetailed(
      100000,
      12,
      startDate,
      [{ date: repaymentDate, amount: 5000, principalAmount: 0, interestAmount: 5000 }],
      repaymentDate,
    );

    expect(result.crdInteretsCourus).toBe(0);
    expect(result.crdCapital).toBe(100000);
    expect(result.crdTotal).toBe(100000);
  });

  it('la ventilation réelle change la trajectoire du capital sur plusieurs remboursements, pas seulement le total du remboursement concerné', () => {
    const repayment1Date = new Date('2026-02-10T00:00:00Z'); // jour 40
    const repayment2Date = new Date('2026-03-22T00:00:00Z'); // jour 80

    const imputedOnly = computeCrdDetailed(
      100000,
      12,
      startDate,
      [
        { date: repayment1Date, amount: 2000 },
        { date: repayment2Date, amount: 2000 },
      ],
      repayment2Date,
    );
    expect(imputedOnly.crdTotal).toBeCloseTo(98621.13, 2);

    const firstRepaymentSplit = computeCrdDetailed(
      100000,
      12,
      startDate,
      [
        { date: repayment1Date, amount: 2000, principalAmount: 1800, interestAmount: 200 },
        { date: repayment2Date, amount: 2000 },
      ],
      repayment2Date,
    );
    expect(firstRepaymentSplit.crdCapital).toBeCloseTo(97491.4, 2);
    expect(firstRepaymentSplit.crdInteretsCourus).toBeCloseTo(1115.07, 2);
    expect(firstRepaymentSplit.crdTotal).toBeCloseTo(98606.47, 2);

    // Contrairement au remboursement isolé, les deux totaux divergent désormais (≈14,65 € d'écart) :
    // le second remboursement accrue ses intérêts sur un capital restant différent selon que le
    // premier ait réduit le capital de 1800 € (réel) ou ≈684,93 € (imputé).
    expect(Math.abs(imputedOnly.crdTotal! - firstRepaymentSplit.crdTotal!)).toBeGreaterThan(1);
  });
});
