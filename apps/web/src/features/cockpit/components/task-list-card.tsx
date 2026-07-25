import { Link } from 'react-router-dom';
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useToggleTask } from '@/features/tasks/use-tasks';
import { PRIORITY_LABELS, type Task } from '@/types';
import { cn } from '@/lib/utils';

const PRIORITY_VARIANT: Record<Task['priority'], 'default' | 'warning' | 'destructive' | 'secondary'> = {
  LOW: 'secondary',
  MEDIUM: 'default',
  HIGH: 'warning',
  URGENT: 'destructive',
};

interface TaskListCardProps {
  title: string;
  tasks: Task[];
  emptyLabel: string;
  showDueDate?: boolean;
}

export function TaskListCard({ title, tasks, emptyLabel, showDueDate }: TaskListCardProps) {
  const toggleTask = useToggleTask();

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle>{title}</CardTitle>
        <span className="text-xs text-muted-foreground">{tasks.length}</span>
      </CardHeader>
      <CardContent className="flex flex-col gap-1">
        {tasks.length === 0 && <p className="py-4 text-center text-xs text-muted-foreground">{emptyLabel}</p>}
        {tasks.map((task) => (
          <div key={task.id} className="flex items-start gap-2.5 rounded-md px-1.5 py-1.5 hover:bg-accent">
            <button
              onClick={() => toggleTask.mutate({ id: task.id, done: !task.done })}
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
            <Badge variant={PRIORITY_VARIANT[task.priority]} className="shrink-0">
              {PRIORITY_LABELS[task.priority]}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
