import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateTask } from './use-tasks';
import type { Task } from '@/types';
import { ApiError } from '@/lib/api';

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  dueDate: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function EditTaskDialog({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { title: task.title, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' },
  });

  const onSubmit = (values: FormValues) => {
    updateTask.mutate(
      { id: task.id, title: values.title, dueDate: values.dueDate || undefined },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset({ title: task.title, dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '' });
      }}
    >
      <DialogTrigger asChild>
        <button
          onClick={(e) => e.stopPropagation()}
          className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-muted-foreground hover:bg-accent hover:text-foreground"
          aria-label="Modifier la tâche"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Modifier la tâche</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-title">Titre</Label>
            <Input id="task-title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="task-dueDate">Échéance</Label>
            <Input id="task-dueDate" type="date" {...register('dueDate')} />
          </div>
          {updateTask.isError && (
            <p className="text-xs text-destructive">
              {updateTask.error instanceof ApiError ? updateTask.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={updateTask.isPending}>
              {updateTask.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
