import { computeInterestPaymentStatus, resolveCurrentInterestDueDate, INTEREST_PAYMENT_GRACE_DAYS } from './interest-payment.util';

describe('resolveCurrentInterestDueDate', () => {
  it("renvoie le jour d'echeance de ce mois si deja atteint", () => {
    const due = resolveCurrentInterestDueDate(15, new Date(2026, 2, 20)); // 20 mars
    expect(due).toEqual(new Date(2026, 2, 15));
  });

  it("renvoie le jour d'echeance du mois precedent si celui de ce mois n'est pas encore atteint", () => {
    const due = resolveCurrentInterestDueDate(15, new Date(2026, 2, 10)); // 10 mars, echeance le 15
    expect(due).toEqual(new Date(2026, 1, 15)); // 15 fevrier
  });

  it('gere le passage janvier -> decembre annee precedente', () => {
    const due = resolveCurrentInterestDueDate(20, new Date(2026, 0, 5)); // 5 janvier, echeance le 20
    expect(due).toEqual(new Date(2025, 11, 20)); // 20 decembre 2025
  });

  it('ajuste au dernier jour du mois si le jour cible depasse (ex. 31 en fevrier)', () => {
    const due = resolveCurrentInterestDueDate(31, new Date(2026, 1, 28)); // fevrier 2026 (non bissextile, 28 jours)
    expect(due).toEqual(new Date(2026, 1, 28));
  });

  it('le jour du mois exact -> echeance de ce mois (limite inclusive)', () => {
    const due = resolveCurrentInterestDueDate(15, new Date(2026, 2, 15));
    expect(due).toEqual(new Date(2026, 2, 15));
  });
});

describe('computeInterestPaymentStatus', () => {
  const asOfDate = new Date(2026, 2, 20); // 20 mars, echeance du cycle = 15 mars

  it('paiement enregistre a la date d\'echeance ou apres -> RAS', () => {
    const status = computeInterestPaymentStatus(15, new Date(2026, 2, 15), asOfDate);
    expect(status.level).toBe('RAS');
    expect(status.daysOverdue).toBe(0);
  });

  it('paiement enregistre apres l\'echeance (dans le cycle) -> RAS', () => {
    const status = computeInterestPaymentStatus(15, new Date(2026, 2, 18), asOfDate);
    expect(status.level).toBe('RAS');
  });

  it('dernier paiement avant l\'echeance du cycle en cours (cycle precedent) -> pas compte, en retard', () => {
    const status = computeInterestPaymentStatus(15, new Date(2026, 1, 15), asOfDate); // paiement de fevrier seulement
    expect(status.level).not.toBe('RAS');
  });

  it('aucun paiement jamais enregistre -> jamais presume paye (Unknown != Zero)', () => {
    const status = computeInterestPaymentStatus(15, null, asOfDate);
    expect(status.level).not.toBe('RAS');
    expect(status.daysOverdue).toBeGreaterThan(0);
  });

  it('dans la fenetre de tolerance (<= GRACE_DAYS) -> DUE_SOON, pas encore OVERDUE', () => {
    const withinGrace = new Date(2026, 2, 15 + INTEREST_PAYMENT_GRACE_DAYS);
    const status = computeInterestPaymentStatus(15, null, withinGrace);
    expect(status.level).toBe('DUE_SOON');
  });

  it('au-dela de la fenetre de tolerance -> OVERDUE', () => {
    const beyondGrace = new Date(2026, 2, 15 + INTEREST_PAYMENT_GRACE_DAYS + 1);
    const status = computeInterestPaymentStatus(15, null, beyondGrace);
    expect(status.level).toBe('OVERDUE');
  });

  it('echeance du jour meme, rien encore paye -> RAS (pas encore en retard)', () => {
    const status = computeInterestPaymentStatus(15, null, new Date(2026, 2, 15));
    expect(status.level).toBe('RAS');
    expect(status.daysOverdue).toBe(0);
  });

  it('daysOverdue croit avec le temps ecoule depuis l\'echeance', () => {
    const status10 = computeInterestPaymentStatus(15, null, new Date(2026, 2, 25));
    expect(status10.daysOverdue).toBe(10);
  });
});
