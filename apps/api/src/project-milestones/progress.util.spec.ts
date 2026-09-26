import { computeProjectProgress } from './progress.util';

describe('computeProjectProgress', () => {
  it('renvoie null (pas 0) quand aucun jalon ni tâche n\'existe — rien n\'est encore planifié', () => {
    const result = computeProjectProgress([], []);
    expect(result.progressPct).toBeNull();
    expect(result.milestonesTotal).toBe(0);
    expect(result.tasksTotal).toBe(0);
  });

  it('avec seulement des jalons, ils portent 100% du calcul', () => {
    const result = computeProjectProgress(
      [
        { status: 'DONE', blocking: true },
        { status: 'PENDING', blocking: false },
      ],
      [],
    );
    expect(result.progressPct).toBe(50);
  });

  it('avec seulement des tâches, elles portent 100% du calcul', () => {
    const result = computeProjectProgress([], [{ done: true }, { done: true }, { done: false }, { done: false }]);
    expect(result.progressPct).toBe(50);
  });

  it('pondère 70% jalons / 30% tâches quand les deux existent', () => {
    const result = computeProjectProgress(
      [{ status: 'DONE', blocking: true }, { status: 'DONE', blocking: false }],
      [{ done: false }, { done: false }],
    );
    // milestonePct=1, taskPct=0 -> 1*0.7 + 0*0.3 = 0.7 -> 70%
    expect(result.progressPct).toBe(70);
  });

  it('WAIVED compte comme résolu au même titre que DONE', () => {
    const result = computeProjectProgress([{ status: 'WAIVED', blocking: true }], []);
    expect(result.progressPct).toBe(100);
    expect(result.milestonesDone).toBe(1);
  });

  it('compte les jalons bloquants encore ouverts indépendamment du pourcentage', () => {
    const result = computeProjectProgress(
      [
        { status: 'BLOCKED', blocking: true },
        { status: 'DONE', blocking: true },
        { status: 'AT_RISK', blocking: false },
      ],
      [],
    );
    expect(result.blockingOpenCount).toBe(1);
  });
});
