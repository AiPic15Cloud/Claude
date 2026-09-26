import { computeLoanLifecycle, computePostEcheanceSegments } from './loan-lifecycle.util';

describe('computeLoanLifecycle', () => {
  it('renvoie INSUFFICIENT_DATA si des champs requis manquent', () => {
    expect(computeLoanLifecycle({ startDate: null, durationMonths: 12, dateEcheanceInitiale: new Date('2026-01-01'), extensions: [], terminal: null })).toEqual({ status: 'INSUFFICIENT_DATA' });
    expect(computeLoanLifecycle({ startDate: new Date('2025-01-01'), durationMonths: null, dateEcheanceInitiale: new Date('2026-01-01'), extensions: [], terminal: null })).toEqual({ status: 'INSUFFICIENT_DATA' });
    expect(computeLoanLifecycle({ startDate: new Date('2025-01-01'), durationMonths: 12, dateEcheanceInitiale: null, extensions: [], terminal: null })).toEqual({ status: 'INSUFFICIENT_DATA' });
  });

  it('cas nominal (dateDureeCible ≤ dateEcheanceInitiale) : uniquement NORMAL tant que la durée cible n\'est pas atteinte, retard nul', () => {
    const startDate = new Date('2024-01-01');
    const dateEcheanceInitiale = new Date('2025-01-01'); // 12 mois de délai contractuel
    const now = new Date('2024-06-01'); // avant dateDureeCible (10 mois) et avant l'échéance

    const result = computeLoanLifecycle({ startDate, durationMonths: 10, dateEcheanceInitiale, extensions: [], terminal: null }, now);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    expect(result.segments).toEqual([{ kind: 'NORMAL', start: startDate, end: now }]);
    expect(result.retardDays).toBe(0);
  });

  it('cas nominal, durée cible dépassée mais échéance contractuelle pas encore atteinte : segment DEPASSEMENT, retard calculé contre dateDureeCible', () => {
    const startDate = new Date('2024-01-01');
    const dateEcheanceInitiale = new Date('2025-01-01'); // 12 mois de délai contractuel
    const now = new Date('2024-12-01'); // après dateDureeCible (10 mois), avant l'échéance

    const result = computeLoanLifecycle({ startDate, durationMonths: 10, dateEcheanceInitiale, extensions: [], terminal: null }, now);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    expect(result.segments.map((s) => s.kind)).toEqual(['NORMAL', 'DEPASSEMENT']);
    expect(result.segments[0].end).toEqual(result.dateDureeCible);
    const expectedRetardDays = Math.floor((now.getTime() - result.dateDureeCible.getTime()) / 86_400_000);
    expect(result.retardDays).toBe(expectedRetardDays);
    expect(result.retardDays).toBeGreaterThan(0);
  });

  it('regression : une durée cible qui dépasse l\'échéance contractuelle ne doit jamais faire croire que le prêt est "dans les clous" après l\'échéance', () => {
    // startDate + 24 mois de durée cible => dateDureeCible dépasse largement
    // l'échéance contractuelle réelle (12 mois après startDate).
    const startDate = new Date('2024-01-01');
    const dateEcheanceInitiale = new Date('2025-01-01');
    const now = new Date('2025-06-01'); // 5 mois après l'échéance contractuelle, mais avant dateDureeCible (2026-01-01)

    const result = computeLoanLifecycle({ startDate, durationMonths: 24, dateEcheanceInitiale, extensions: [], terminal: null }, now);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    // dateDureeCible reste la vraie valeur saisie (informative), non plafonnée.
    expect(result.dateDureeCible).toEqual(new Date('2026-01-01'));

    // Avant le fix : le segment NORMAL (borné par dateDureeCible = 2026-01-01)
    // aurait couvert tout l'intervalle jusqu'à `now`, chevauchant le segment
    // HORS_CONTRAT généré à partir de dateEcheanceInitiale, et retardDays
    // aurait été 0 (now < dateDureeCible) alors que le prêt est en retard
    // depuis 5 mois.
    expect(result.segments.map((s) => s.kind)).toEqual(['NORMAL', 'HORS_CONTRAT']);
    expect(result.segments[0].end).toEqual(dateEcheanceInitiale); // NORMAL plafonné à l'échéance contractuelle, jamais au-delà
    expect(result.segments[1].start).toEqual(dateEcheanceInitiale); // pas de chevauchement : HORS_CONTRAT reprend exactement où NORMAL s'arrête
    expect(result.segments[1].end).toEqual(now);

    const expectedRetardDays = Math.floor((now.getTime() - dateEcheanceInitiale.getTime()) / 86_400_000);
    expect(result.retardDays).toBe(expectedRetardDays);
    expect(result.retardDays).toBeGreaterThan(0);
  });

  it('regression : même quand `now` dépasse aussi la durée cible dépassant l\'échéance, le retard part de l\'échéance contractuelle, pas de la durée cible', () => {
    const startDate = new Date('2024-01-01');
    const dateEcheanceInitiale = new Date('2025-01-01');
    const dateDureeCible = new Date('2025-04-01'); // durée cible (15 mois) au-delà de l'échéance (12 mois)
    const now = new Date('2025-07-01'); // après dateDureeCible ET après dateEcheanceInitiale

    const result = computeLoanLifecycle({ startDate, durationMonths: 15, dateEcheanceInitiale, extensions: [], terminal: null }, now);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    expect(result.dateDureeCible).toEqual(dateDureeCible);
    // Aucun segment DEPASSEMENT : la fenêtre [dateEcheanceInitiale, dateDureeCible]
    // n'a pas de sens contractuel ici puisque l'échéance a déjà été franchie
    // avant que la durée cible ne le soit.
    expect(result.segments.map((s) => s.kind)).toEqual(['NORMAL', 'HORS_CONTRAT']);

    const expectedRetardDays = Math.floor((now.getTime() - dateEcheanceInitiale.getTime()) / 86_400_000);
    expect(result.retardDays).toBe(expectedRetardDays);
  });

  it('une prorogation signée après l\'échéance régularise la période hors-contrat (retard calculé contre l\'échéance reste positif jusqu\'à la signature)', () => {
    const startDate = new Date('2024-01-01');
    const dateEcheanceInitiale = new Date('2025-01-01');
    const now = new Date('2025-03-01');
    const extension = { dateSignature: new Date('2025-02-01'), nouvelleDateEcheance: new Date('2025-06-01') };

    const result = computeLoanLifecycle({ startDate, durationMonths: 12, dateEcheanceInitiale, extensions: [extension], terminal: null }, now);
    expect(result.status).toBe('OK');
    if (result.status !== 'OK') return;

    expect(result.segments.map((s) => s.kind)).toEqual(['NORMAL', 'HORS_CONTRAT', 'PROROGE']);
  });
});

describe('computePostEcheanceSegments', () => {
  it('reste hors-contrat jusqu\'à finDate quand rien n\'est signé', () => {
    const dateEcheanceInitiale = new Date('2025-01-01');
    const finDate = new Date('2025-04-01');
    const segments = computePostEcheanceSegments(dateEcheanceInitiale, [], finDate);
    expect(segments).toEqual([{ kind: 'HORS_CONTRAT', start: dateEcheanceInitiale, end: finDate }]);
  });

  it('ne produit pas de segment hors-contrat si la prorogation est signée avant l\'échéance (pas de rattrapage)', () => {
    const dateEcheanceInitiale = new Date('2025-01-01');
    const finDate = new Date('2025-06-01');
    const extension = { dateSignature: new Date('2024-12-01'), nouvelleDateEcheance: new Date('2025-06-01') };
    const segments = computePostEcheanceSegments(dateEcheanceInitiale, [extension], finDate);
    expect(segments).toEqual([{ kind: 'PROROGE', start: dateEcheanceInitiale, end: finDate }]);
  });
});
