import { computePipelineConversion, type StatusHistoryRow } from './pipeline-conversion.util';

function row(projectId: string, toStatus: string, changedAt: string): StatusHistoryRow {
  return { projectId, toStatus, changedAt: new Date(changedAt) };
}

describe('computePipelineConversion — spec Cockpit/Fractionné P2 §4.1.5', () => {
  it('signale un échantillon trop petit pour des taux avec deux dossiers, sans empêcher le calcul des nombres bruts', () => {
    const history: StatusHistoryRow[] = [row('p1', 'PISTE', '2026-01-01'), row('p2', 'PISTE', '2026-01-05')];
    const result = computePipelineConversion(history, 2);

    expect(result.totalProjects).toBe(2);
    expect(result.projectsWithoutHistory).toBe(0);
    expect(result.sampleTooSmallForRates).toBe(true);
    expect(result.stages.find((s) => s.key === 'RECUES')!.count).toBe(2);
  });

  it('un dossier compte pour chaque étape déjà dépassée, pas seulement son statut actuel', () => {
    const history: StatusHistoryRow[] = [
      row('p1', 'PISTE', '2026-01-01'),
      row('p1', 'QUALIFICATION', '2026-01-10'),
      row('p1', 'ANALYSE', '2026-01-20'),
      row('p1', 'STRUCTURATION', '2026-02-01'),
      row('p1', 'VALIDATION_PLATEFORME', '2026-02-15'),
    ];
    const result = computePipelineConversion(history, 1);

    expect(result.stages.find((s) => s.key === 'RECUES')!.count).toBe(1);
    expect(result.stages.find((s) => s.key === 'QUALIFIEES')!.count).toBe(1);
    expect(result.stages.find((s) => s.key === 'PRESENTEES')!.count).toBe(1);
    expect(result.stages.find((s) => s.key === 'ACCORDS')!.count).toBe(0);
  });

  it('un dossier REFUSE/ABANDONNE ne compte jamais pour une étape du funnel qu\'il n\'a jamais atteinte', () => {
    const history: StatusHistoryRow[] = [row('p1', 'PISTE', '2026-01-01'), row('p1', 'REFUSE', '2026-01-05')];
    const result = computePipelineConversion(history, 1);

    expect(result.stages.find((s) => s.key === 'QUALIFIEES')!.count).toBe(0);
  });

  it('calcule un taux de conversion correct entre deux étapes consécutives', () => {
    const history: StatusHistoryRow[] = [
      row('p1', 'PISTE', '2026-01-01'),
      row('p1', 'QUALIFICATION', '2026-01-05'),
      row('p2', 'PISTE', '2026-01-01'),
      // p2 ne qualifie jamais
    ];
    const result = computePipelineConversion(history, 2);
    const conv = result.conversions.find((c) => c.fromKey === 'RECUES' && c.toKey === 'QUALIFIEES')!;

    expect(conv.fromCount).toBe(2);
    expect(conv.toCount).toBe(1);
    expect(conv.ratePct).toBe(50);
  });

  it('calcule un délai médian en jours entre deux étapes pour les dossiers ayant atteint les deux', () => {
    const history: StatusHistoryRow[] = [
      row('p1', 'PISTE', '2026-01-01'),
      row('p1', 'QUALIFICATION', '2026-01-11'), // 10 jours
      row('p2', 'PISTE', '2026-01-01'),
      row('p2', 'QUALIFICATION', '2026-01-21'), // 20 jours
    ];
    const result = computePipelineConversion(history, 2);
    const conv = result.conversions.find((c) => c.fromKey === 'RECUES' && c.toKey === 'QUALIFIEES')!;

    expect(conv.medianDays).toBe(15);
  });

  it('un taux de conversion est null (jamais 0% trompeur) quand aucun dossier n\'a atteint l\'étape de départ', () => {
    const result = computePipelineConversion([], 0);
    const conv = result.conversions.find((c) => c.fromKey === 'RECUES' && c.toKey === 'QUALIFIEES')!;

    expect(conv.ratePct).toBeNull();
    expect(conv.medianDays).toBeNull();
  });

  it('un dossier sans aucune ligne d\'historique (import/seed hors du chemin create() normal) est signalé à part, jamais fondu dans "0 dossier en pipeline" (audit : 0 dossier au cockpit vs 2 dans le module Fractionné)', () => {
    const history: StatusHistoryRow[] = [row('p1', 'PISTE', '2026-01-01')];
    // 3 FractionalProject existent réellement pour l'organisation, mais 2 n'ont aucune ligne d'historique.
    const result = computePipelineConversion(history, 3);

    expect(result.totalProjects).toBe(1);
    expect(result.projectsWithoutHistory).toBe(2);
  });

  it('projectsWithoutHistory est 0 quand tous les dossiers ont un historique', () => {
    const history: StatusHistoryRow[] = [row('p1', 'PISTE', '2026-01-01'), row('p2', 'PISTE', '2026-01-05')];
    const result = computePipelineConversion(history, 2);

    expect(result.projectsWithoutHistory).toBe(0);
  });
});
