import { ArrowDown, ArrowUp, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ConfirmDeleteButton } from '@/components/ui/confirm-delete-button';
import {
  useMilestones,
  useMilestoneProgress,
  useUpdateMilestone,
  useDeleteMilestone,
  useReorderMilestones,
} from '../hooks/use-milestones';
import { MilestoneFormDialog } from './milestone-form-dialog';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { MILESTONE_STATUS_LABELS, type MilestoneStatus, type PortfolioMilestone } from '@/types';

const STATUSES: MilestoneStatus[] = ['PENDING', 'IN_PROGRESS', 'AT_RISK', 'BLOCKED', 'DONE', 'WAIVED'];

// Même famille de couleurs sémantiques que les badges de statut ailleurs dans
// ATLAS (risque, cycle de vie du deal) — un jalon "à risque"/"bloqué" doit se
// distinguer d'un coup d'œil dans la liste, pas seulement après ouverture du select.
const MILESTONE_STATUS_DOT: Record<MilestoneStatus, string> = {
  PENDING: 'bg-muted-foreground',
  IN_PROGRESS: 'bg-primary',
  AT_RISK: 'bg-warning',
  BLOCKED: 'bg-destructive',
  DONE: 'bg-success',
  WAIVED: 'bg-muted-foreground',
};

export function MilestonesPanel({ dealId }: { dealId: string }) {
  const { data: milestones = [], isLoading } = useMilestones(dealId);
  const { data: progress } = useMilestoneProgress(dealId);
  const updateMilestone = useUpdateMilestone(dealId);
  const deleteMilestone = useDeleteMilestone(dealId);
  const reorderMilestones = useReorderMilestones(dealId);

  const ordered = [...milestones].sort((a, b) => a.order - b.order);

  const moveMilestone = (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    reorderMilestones.mutate(next.map((m) => m.id));
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle>Planification</CardTitle>
        <MilestoneFormDialog dealId={dealId} nextOrder={ordered.length} />
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {progress && (
          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="font-medium">Avancement du projet</span>
              <span className={cn('tabular-nums', progress.progressPct === null ? 'text-muted-foreground' : 'font-semibold')}>
                {progress.progressPct === null ? 'Non planifié' : `${progress.progressPct} %`}
              </span>
            </div>
            {/* Une barre à 0% se lit visuellement comme "0% d'avancement" — quand la valeur
                est réellement inconnue (aucun jalon ni tâche), on l'omet plutôt que de la
                faire mentir par défaut (doctrine "Unknown ≠ Zero"). */}
            {progress.progressPct !== null && <Progress value={progress.progressPct} />}
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
              <span>
                {progress.milestonesDone}/{progress.milestonesTotal} jalon(s)
              </span>
              <span>
                {progress.tasksDone}/{progress.tasksTotal} tâche(s)
              </span>
            </div>
            {progress.blockingOpenCount > 0 && (
              <p className="flex items-center gap-1.5 text-xs text-destructive">
                <TriangleAlert className="h-3.5 w-3.5" />
                {progress.blockingOpenCount} jalon{progress.blockingOpenCount > 1 ? 's' : ''} bloquant
                {progress.blockingOpenCount > 1 ? 's' : ''} encore ouvert{progress.blockingOpenCount > 1 ? 's' : ''}
              </p>
            )}
          </div>
        )}

        {!isLoading && ordered.length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Aucun jalon planifié pour ce dossier</p>
        )}

        <div className="flex flex-col gap-2">
          {ordered.map((milestone, index) => (
            <MilestoneRow
              key={milestone.id}
              dealId={dealId}
              milestone={milestone}
              canMoveUp={index > 0}
              canMoveDown={index < ordered.length - 1}
              onMoveUp={() => moveMilestone(index, -1)}
              onMoveDown={() => moveMilestone(index, 1)}
              onStatusChange={(status) => updateMilestone.mutate({ id: milestone.id, status })}
              onDelete={() => deleteMilestone.mutate(milestone.id)}
              deletePending={deleteMilestone.isPending}
            />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function MilestoneRow({
  dealId,
  milestone,
  canMoveUp,
  canMoveDown,
  onMoveUp,
  onMoveDown,
  onStatusChange,
  onDelete,
  deletePending,
}: {
  dealId: string;
  milestone: PortfolioMilestone;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onStatusChange: (status: MilestoneStatus) => void;
  onDelete: () => void;
  deletePending: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-md border border-border p-3 sm:flex-row sm:items-start">
      <div className="flex shrink-0 flex-row gap-1 sm:flex-col">
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveUp} onClick={onMoveUp} aria-label="Monter le jalon">
          <ArrowUp className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="icon" className="h-6 w-6" disabled={!canMoveDown} onClick={onMoveDown} aria-label="Descendre le jalon">
          <ArrowDown className="h-3.5 w-3.5" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-sm font-medium">{milestone.label}</span>
          {milestone.blocking && <Badge variant="destructive">Bloquant</Badge>}
          {milestone.targetDate && <span className="text-xs text-muted-foreground">Cible : {formatDate(milestone.targetDate)}</span>}
        </div>
        {milestone.description && <p className="text-xs text-muted-foreground">{milestone.description}</p>}
        {milestone.tasks.length > 0 && (
          <ul className="mt-1.5 flex flex-col gap-0.5">
            {milestone.tasks.map((t) => (
              <li key={t.id} className={`text-xs ${t.done ? 'text-muted-foreground line-through' : 'text-foreground'}`}>
                {t.done ? '✓' : '○'} {t.title}
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-2 sm:ml-auto sm:justify-end">
        <Select value={milestone.status} onValueChange={(v) => onStatusChange(v as MilestoneStatus)}>
          <SelectTrigger className="w-[11rem]">
            <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', MILESTONE_STATUS_DOT[milestone.status])} />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((s) => (
              <SelectItem key={s} value={s}>
                <span className="flex items-center gap-2">
                  <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', MILESTONE_STATUS_DOT[s])} />
                  {MILESTONE_STATUS_LABELS[s]}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <MilestoneFormDialog dealId={dealId} milestone={milestone} />
        <ConfirmDeleteButton onConfirm={onDelete} pending={deletePending} label="Supprimer le jalon" />
      </div>
    </div>
  );
}
