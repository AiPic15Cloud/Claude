import { computeXirr } from './xirr.util';

describe('computeXirr', () => {
  it('resout un TRI simple a 2 flux (investissement puis remboursement a 1 an)', () => {
    const irr = computeXirr([
      { date: new Date('2024-01-01'), amount: -1000 },
      { date: new Date('2025-01-01'), amount: 1100 },
    ]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeCloseTo(0.1, 2);
  });

  it('resout un TRI a flux multiples et dates irregulieres', () => {
    const irr = computeXirr([
      { date: new Date('2024-01-01'), amount: -1000 },
      { date: new Date('2024-07-01'), amount: 50 },
      { date: new Date('2025-01-01'), amount: 50 },
      { date: new Date('2026-01-01'), amount: 1100 },
    ]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeGreaterThan(0);
  });

  it('renvoie null si tous les flux sont de meme signe (aucun TRI defini)', () => {
    const irr = computeXirr([
      { date: new Date('2024-01-01'), amount: 100 },
      { date: new Date('2025-01-01'), amount: 200 },
    ]);
    expect(irr).toBeNull();
  });

  it('renvoie null si tous les flux tombent a la meme date que le flux initial (degenerescence)', () => {
    // NPV constante quel que soit le taux d'actualisation -> aucun TRI mathematiquement defini.
    const irr = computeXirr([
      { date: new Date('2024-01-01'), amount: -1000 },
      { date: new Date('2024-01-01'), amount: 1200 },
    ]);
    expect(irr).toBeNull();
  });

  it('renvoie null pour moins de 2 flux', () => {
    expect(computeXirr([{ date: new Date('2024-01-01'), amount: -1000 }])).toBeNull();
    expect(computeXirr([])).toBeNull();
  });

  it('gere une perte partielle (TRI negatif)', () => {
    const irr = computeXirr([
      { date: new Date('2024-01-01'), amount: -1000 },
      { date: new Date('2025-01-01'), amount: 800 },
    ]);
    expect(irr).not.toBeNull();
    expect(irr!).toBeLessThan(0);
  });
});
