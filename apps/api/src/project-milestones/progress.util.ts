import { MilestoneStatus } from '@prisma/client';

export interface ProgressMilestoneInput {
  status: MilestoneStatus;
  blocking: boolean;
}

export interface ProgressTaskInput {
  done: boolean;
}

export interface ProjectProgressResult {
  /** Pourcentage d'avancement (0-100), ou null si rien n'est encore planifié
   * pour ce dossier — jamais 0 par défaut (doctrine "Unknown ≠ Zero" : un
   * dossier sans jalon ni tâche n'est pas "à 0% d'avancement", il n'a
   * simplement pas encore été planifié). */
  progressPct: number | null;
  milestonesTotal: number;
  milestonesDone: number;
  blockingOpenCount: number;
  tasksTotal: number;
  tasksDone: number;
}

/**
 * Avancement composite d'un dossier : jalons (poids fort, ce sont les
 * étapes qui structurent le projet) + tâches (poids résiduel, le travail
 * courant). Un jalon bloquant encore ouvert (PENDING/IN_PROGRESS/AT_RISK/
 * BLOCKED) compte comme "non fait" quel que soit l'avancement des tâches —
 * il gate la progression affichée, cohérent avec son rôle de jalon
 * bloquant plutôt qu'informatif.
 */
export function computeProjectProgress(
  milestones: ProgressMilestoneInput[],
  tasks: ProgressTaskInput[],
): ProjectProgressResult {
  const milestonesTotal = milestones.length;
  const milestonesDone = milestones.filter((m) => m.status === 'DONE' || m.status === 'WAIVED').length;
  const blockingOpenCount = milestones.filter((m) => m.blocking && m.status !== 'DONE' && m.status !== 'WAIVED').length;

  const tasksTotal = tasks.length;
  const tasksDone = tasks.filter((t) => t.done).length;

  if (milestonesTotal === 0 && tasksTotal === 0) {
    return { progressPct: null, milestonesTotal, milestonesDone, blockingOpenCount, tasksTotal, tasksDone };
  }

  // Poids 70/30 quand les deux existent — les jalons structurent le projet,
  // les tâches sont le détail d'exécution ; quand un seul des deux existe,
  // il porte 100% du calcul plutôt que de diluer avec un dénominateur vide.
  const milestoneWeight = milestonesTotal > 0 && tasksTotal > 0 ? 0.7 : milestonesTotal > 0 ? 1 : 0;
  const taskWeight = 1 - milestoneWeight;

  const milestonePct = milestonesTotal > 0 ? milestonesDone / milestonesTotal : 0;
  const taskPct = tasksTotal > 0 ? tasksDone / tasksTotal : 0;

  const progressPct = Math.round((milestonePct * milestoneWeight + taskPct * taskWeight) * 100);

  return { progressPct, milestonesTotal, milestonesDone, blockingOpenCount, tasksTotal, tasksDone };
}
