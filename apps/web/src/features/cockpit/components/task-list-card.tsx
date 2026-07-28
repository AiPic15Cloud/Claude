import { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToggleTask, useCreateTask, useDeleteTask, useUpdateTaskPriority } from '@/features/tasks/use-tasks';
import { PRIORITY_LABELS, type Task } from '@/types';
import { cn } from '@/lib/utils';

const PRIORITY_ORDER: Task['priority'][] = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

const PRIORITY_VARIANT: Record<Task['priority'], 'default' | 'warning' | 'destructive' | 'secondary'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function PriorityPicker({ priority, onChange }: { priority: Task['priority']; onChange: (p: Task['priority']) => void }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className="shrink-0" onClick={(e) => e.stopPropagation()} aria-label="Changer la priorité">
          <Badge variant={PRIORITY_VARIANT[priority]} className="cursor-pointer select-none hover:opacity-80">
            {PRIORITY_LABELS[priority]}
          </Badge>
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {PRIORITY_ORDER.map((p) => (
          <DropdownMenuItem key={p} onClick={() => onChange(p)} className="gap-2">
            <Badge variant={PRIORITY_VARIANT[p]}>{PRIORITY_LABELS[p]}</Badge>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

interface TaskListCardProps {
  title: string;
  tasks: Task[];
  emptyLabel: string;
  showDueDate?: boolean;
  /** Personal quick-tasks: an inline "add" form, and checking one off deletes it instead of just marking it done. */
  quickAdd?: boolean;
}

export function TaskListCard({ title, tasks, emptyLabel, showDueDate, quickAdd }: TaskListCardProps) {
  const toggleTask = useToggleTask();
  const createTask = useCreateTask();
  const deleteTask = useDeleteTask();
  const updatePriority = useUpdateTaskPriority();
  const [newTitle, setNewTitle] = useState('');
  const [newDueDate, setNewDueDate] = useState(todayIso());
  const [newPriority, setNewPriority] = useState<Task['priority']>('MEDIUM');

  const handleAdd = () => {
    const title = newTitle.trim();
    if (!title) return;
    createTask.mutate(
      { title, dueDate: newDueDate || undefined, priority: newPriority },
      { onSuccess: () => setNewTitle('') },
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {quickAdd && (
          <div className="mb-1 flex items-center gap-1.5 rounded-md border border-dashed border-input p-1.5">
            <Input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
              placeholder="Nouvelle tâche…"
              className="h-7 flex-1 border-0 bg-transparent px-1.5 text-sm shadow-none focus-visible:ring-0"
            />
            <PriorityPicker priority={newPriority} onChange={setNewPriority} />
            <Input
              type="date"
              value={newDueDate}
              onChange={(e) => setNewDueDate(e.target.value)}
              className="h-7 w-[124px] shrink-0 px-1.5 text-xs"
              aria-label="Date d'échéance"
            />
            <Button
              size="icon"
              variant="secondary"
              className="h-7 w-7 shrink-0"
              disabled={!newTitle.trim() || createTask.isPending}
              onClick={handleAdd}
              aria-label="Ajouter la tâche"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        )}
        {tasks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent">
            <button
              onClick={() =>
                quickAdd ? deleteTask.mutate(task.id) : toggleTask.mutate({ id: task.id, done: !task.done })
              }
              className={cn(
                'mt-0.5 h-4 w-4 shrink-0 rounded border transition-colors',
                task.done ? 'border-primary bg-primary' : 'border-input bg-background hover:border-primary',
              )}
              aria-label={task.done ? 'Marquer comme non fait' : 'Marquer comme fait'}
            />
            <div className="flex-1 overflow-hidden">
              <p className={cn('truncate text-sm', task.done && 'text-muted-foreground line-through')}>{task.title}</p>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {task.deal && (
                  <Link to={`/deals/${task.deal.id}`} className="truncate hover:text-primary hover:underline">
                    {task.deal.name}
                  </Link>
                )}
                {showDueDate && task.dueDate && (
                  <span>{formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: fr })}</span>
                )}
              </div>
            </div>
            <PriorityPicker priority={task.priority} onChange={(p) => updatePriority.mutate({ id: task.id, priority: p })} />
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
