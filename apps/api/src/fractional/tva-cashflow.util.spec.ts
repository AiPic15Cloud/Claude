import { computeTvaCashflowEvents, type TvaCashflowInput } from './tva-cashflow.util';

function input(overrides: Partial<TvaCashflowInput> = {}): TvaCashflowInput {
  return { regimeTva: 'PRIX_TOTAL_OPTION_LOYERS', prixNetVendeur: 1000000, tvaTauxPct: 20, tvaRecuperationDelaiMois: 3, ...overrides };
}

describe('computeTvaCashflowEvents', () => {
  it('MARGE ne génère aucun événement — TVA embarquée dans le prix négocié par le vendeur', () => {
    expect(computeTvaCashflowEvents(input({ regimeTva: 'MARGE' }))).toEqual([]);
  });

  it('NON_ASSUJETTI ne génère aucun événement', () => {
    expect(computeTvaCashflowEvents(input({ regimeTva: 'NON_ASSUJETTI' }))).toEqual([]);
  });

  it('PRIX_TOTAL_OPTION_LOYERS génère un décaissement à t=0 et une récupération au délai déclaratif', () => {
    const events = computeTvaCashflowEvents(input());
    expect(events).toEqual([
      { monthsFromAcquisition: 0, amount: -200000, label: "TVA sur le prix (20%) décaissée à l'acquisition" },
      { monthsFromAcquisition: 3, amount: 200000, label: 'Récupération TVA (délai déclaratif 3 mois)' },
    ]);
  });

  it('le montant net des deux événements est toujours nul (aucun coût réel à terme, seulement un décalage)', () => {
    const events = computeTvaCashflowEvents(input({ tvaRecuperationDelaiMois: 14 }));
    expect(events.reduce((sum, e) => sum + e.amount, 0)).toBe(0);
  });

  it('applique les valeurs par défaut (20%, 3 mois) quand elles ne sont pas renseignées', () => {
    const events = computeTvaCashflowEvents(input({ tvaTauxPct: null, tvaRecuperationDelaiMois: null }));
    expect(events[0].amount).toBe(-200000);
    expect(events[1].monthsFromAcquisition).toBe(3);
  });

  it('un taux de TVA différent (ex. réduit) est respecté tel quel', () => {
    const events = computeTvaCashflowEvents(input({ tvaTauxPct: 10 }));
    expect(events[0].amount).toBe(-100000);
    expect(events[1].amount).toBe(100000);
  });
});
