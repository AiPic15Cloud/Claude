import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { DndContext, type DragEndEvent, PointerSensor, useSensor, useSensors, useDroppable, useDraggable } from '@dnd-kit/core';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAllTasks, useMoveTaskToColumn, type KanbanColumn } from './use-tasks';
import { PRIORITY_LABELS, TASK_TYPE_LABELS, type Task, type TaskType, type Priority } from '@/types';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const PRIORITY_VARIANT: Record<Priority, 'default' | 'warning' | 'destructive' | 'secondary'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

const COLUMNS: { id: KanbanColumn; label: string }[] = [
  { id: 'A_FAIRE', label: 'À faire' },
  { id: 'EN_COURS', label: 'En cours' },
  { id: 'TERMINE', label: 'Terminé' },
];

function columnOf(task: Task): KanbanColumn {
  if (task.done) return 'TERMINE';
  if (task.inProgress) return 'EN_COURS';
  return 'A_FAIRE';
}

type DueFilter = 'ALL' | 'WEEK' | 'MONTH' | 'LATE';

function matchesDueFilter(task: Task, filter: DueFilter): boolean {
  if (filter === 'ALL') return true;
  if (!task.dueDate) return false;
  const due = new Date(task.dueDate);
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (filter === 'LATE') return due < startOfToday && !task.done;
  if (filter === 'WEEK') {
    const endOfWeek = new Date(startOfToday);
    endOfWeek.setDate(endOfWeek.getDate() + 7);
    return due >= startOfToday && due <= endOfWeek;
  }
  const endOfMonth = new Date(startOfToday);
  endOfMonth.setDate(endOfMonth.getDate() + 30);
  return due >= startOfToday && due <= endOfMonth;
}

/**
 * Carte de tâche du Kanban transversal (spec ATLAS v2, F.1) — même contenu
 * que demandé : type, titre, dossier lié (cliquable), échéance (mise en
 * évidence si dépassée), priorité.
 */
function TaskKanbanCard({ task }: { task: Task }) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id: task.id });
  const isLate = Boolean(task.dueDate) && !task.done && new Date(task.dueDate!) < new Date(new Date().toDateString());
  const style = transform ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)` } : undefined;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        'flex cursor-grab touch-none flex-col gap-1.5 rounded-md border border-border bg-card p-2.5 text-sm shadow-sm active:cursor-grabbing',
        isDragging && 'opacity-50',
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <Badge variant="outline" className="text-[10px]">
          {TASK_TYPE_LABELS[task.typeTache]}
        </Badge>
        <Badge variant={PRIORITY_VARIANT[task.priority]} className="text-[10px]">
          {PRIORITY_LABELS[task.priority]}
        </Badge>
      </div>
      <p className={cn('font-medium leading-snug', task.done && 'text-muted-foreground line-through')}>{task.title}</p>
      {task.deal && (
        <Link
          to={`/deals/${task.deal.id}`}
          onPointerDown={(e) => e.stopPropagation()}
          className="truncate text-xs text-muted-foreground hover:text-primary hover:underline"
        >
          {task.deal.name} ({task.deal.reference})
        </Link>
      )}
      <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
        {task.dueDate ? <span className={cn(isLate && 'font-medium text-destructive')}>{formatDate(task.dueDate)}</span> : <span />}
        {task.assignee && (
          <span className="truncate">
            {task.assignee.firstName} {task.assignee.lastName}
          </span>
        )}
      </div>
    </div>
  );
}

function KanbanColumnView({ column, tasks }: { column: { id: KanbanColumn; label: string }; tasks: Task[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id });
  return (
    <div
      ref={setNodeRef}
      className={cn(
        'flex h-full w-80 shrink-0 flex-col rounded-lg border border-border bg-secondary/30 transition-colors',
        isOver && 'border-primary/50 bg-primary/5',
      )}
    >
      <div className="flex items-center justify-between border-b border-border/60 px-3 py-2.5">
        <p className="text-sm font-medium">{column.label}</p>
        <span className="rounded-full bg-background px-2 py-0.5 text-xs font-medium text-muted-foreground">{tasks.length}</span>
      </div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2">
        {tasks.map((task) => (
          <TaskKanbanCard key={task.id} task={task} />
        ))}
        {tasks.length === 0 && <p className="py-6 text-center text-xs text-muted-foreground">Aucune tâche</p>}
      </div>
    </div>
  );
}

/**
 * Vue Kanban transversale des tâches (spec ATLAS v2, F.1) — couche de
 * présentation supplémentaire sur le tracker d'actions déjà existant (A.7),
 * pas un nouveau système de tâches : mêmes tâches, mêmes mutations, juste
 * regroupées par statut au niveau portefeuille plutôt que dossier par
 * dossier.
 */
export function TasksKanbanPage() {
  const { data: tasks = [], isLoading } = useAllTasks();
  const moveTask = useMoveTaskToColumn();
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const [typeFilter, setTypeFilter] = useState<TaskType | 'ALL'>('ALL');
  const [dealFilter, setDealFilter] = useState('ALL');
  const [dueFilter, setDueFilter] = useState<DueFilter>('ALL');
  const [ownerFilter, setOwnerFilter] = useState('ALL');
  const [showDone, setShowDone] = useState(false);

  const deals = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) if (t.deal) map.set(t.deal.id, `${t.deal.name} (${t.deal.reference})`);
    return Array.from(map.entries());
  }, [tasks]);

  const owners = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tasks) if (t.assignee) map.set(t.assignee.id, `${t.assignee.firstName} ${t.assignee.lastName}`);
    return Array.from(map.entries());
  }, [tasks]);

  const filtered = tasks.filter((t) => {
    if (typeFilter !== 'ALL' && t.typeTache !== typeFilter) return false;
    if (dealFilter !== 'ALL' && t.deal?.id !== dealFilter) return false;
    if (ownerFilter !== 'ALL' && t.assigneeId !== ownerFilter) return false;
    if (!matchesDueFilter(t, dueFilter)) return false;
    if (t.done && !showDone) return false;
    return true;
  });

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;
    const targetColumn = over.id as KanbanColumn;
    const task = tasks.find((t) => t.id === active.id);
    if (task && columnOf(task) !== targetColumn) {
      moveTask.mutate({ id: task.id, column: targetColumn });
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Tâches</h1>
        <p className="text-sm text-muted-foreground">Vue transversale de toutes les tâches ouvertes, tous dossiers confondus.</p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as TaskType | 'ALL')}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les types</SelectItem>
            {(Object.keys(TASK_TYPE_LABELS) as TaskType[]).map((t) => (
              <SelectItem key={t} value={t}>
                {TASK_TYPE_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dealFilter} onValueChange={setDealFilter}>
          <SelectTrigger className="w-52">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Tous les dossiers</SelectItem>
            {deals.map(([id, label]) => (
              <SelectItem key={id} value={id}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={dueFilter} onValueChange={(v) => setDueFilter(v as DueFilter)}>
          <SelectTrigger className="w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">Toutes échéances</SelectItem>
            <SelectItem value="WEEK">Cette semaine</SelectItem>
            <SelectItem value="MONTH">Ce mois</SelectItem>
            <SelectItem value="LATE">En retard</SelectItem>
          </SelectContent>
        </Select>
        {owners.length > 1 && (
          <Select value={ownerFilter} onValueChange={setOwnerFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Tous les analystes</SelectItem>
              {owners.map(([id, label]) => (
                <SelectItem key={id} value={id}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
        <Button variant={showDone ? 'secondary' : 'outline'} size="sm" onClick={() => setShowDone((v) => !v)}>
          {showDone ? 'Masquer terminées' : 'Afficher terminées'}
        </Button>
      </div>

      {isLoading ? (
        <Skeleton className="h-96 w-full" />
      ) : (
        <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
          <div className="flex h-[calc(100vh-16rem)] gap-3 overflow-x-auto pb-2">
            {COLUMNS.filter((c) => c.id !== 'TERMINE' || showDone).map((column) => (
              <KanbanColumnView key={column.id} column={column} tasks={filtered.filter((t) => columnOf(t) === column.id)} />
            ))}
          </div>
        </DndContext>
      )}
    </div>
  );
}
