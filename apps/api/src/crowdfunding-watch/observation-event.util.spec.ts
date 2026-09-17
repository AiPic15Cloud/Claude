import { decideObservationEvent } from './observation-event.util';

describe('decideObservationEvent', () => {
  it('émet PROJECT_DETECTED (pas de flag) pour une nouvelle observation A_VENIR hors baseline', () => {
    expect(decideObservationEvent(null, 'A_VENIR', false)).toEqual({ eventType: 'PROJECT_DETECTED', discoveredAlreadyOpen: false });
  });

  it('émet FUNDING_OPENED lors de la transition A_VENIR → EN_COLLECTE (annonce puis ouverture = deux événements distincts)', () => {
    const announced = decideObservationEvent(null, 'A_VENIR', false);
    const opened = decideObservationEvent('A_VENIR', 'EN_COLLECTE', false);
    expect(announced.eventType).toBe('PROJECT_DETECTED');
    expect(opened).toEqual({ eventType: 'FUNDING_OPENED', discoveredAlreadyOpen: false });
  });

  it('flague discoveredAlreadyOpen quand une collecte est découverte directement ouverte, sans annonce préalable', () => {
    expect(decideObservationEvent(null, 'EN_COLLECTE', false)).toEqual({ eventType: 'FUNDING_OPENED', discoveredAlreadyOpen: true });
  });

  it("n'émet jamais de notification pour l'état initial (première synchronisation d'une plateforme), quel que soit le statut", () => {
    expect(decideObservationEvent(null, 'A_VENIR', true)).toEqual({ eventType: 'PROJECT_DETECTED', discoveredAlreadyOpen: false });
    expect(decideObservationEvent(null, 'EN_COLLECTE', true)).toEqual({ eventType: 'PROJECT_DETECTED', discoveredAlreadyOpen: false });
  });

  it('un statut inchangé ne produit jamais FUNDING_OPENED (report de date sans fausse ouverture)', () => {
    expect(decideObservationEvent('A_VENIR', 'A_VENIR', false)).toEqual({ eventType: 'PROJECT_UPDATED', discoveredAlreadyOpen: false });
  });

  it('émet FUNDING_CLOSED lors de la transition EN_COLLECTE → CLOTURE', () => {
    expect(decideObservationEvent('EN_COLLECTE', 'CLOTURE', false)).toEqual({ eventType: 'FUNDING_CLOSED', discoveredAlreadyOpen: false });
  });

  it('retombe sur PROJECT_UPDATED pour toute autre transition de statut', () => {
    expect(decideObservationEvent('CLOTURE', 'RETIRE', false)).toEqual({ eventType: 'PROJECT_UPDATED', discoveredAlreadyOpen: false });
  });
});
