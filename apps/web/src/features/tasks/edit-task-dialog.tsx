import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useUpdateTask } from './use-tasks';
import { useMilestones } from '@/features/dossiers/hooks/use-milestones';
import type { Task } from '@/types';
import { ApiError } from '@/lib/api';
import { parseLocaleNumber } from '@/lib/locale-number';

// Le champ heures ne doit jamais coercer une case vide en 0 (une estimation
// non renseignée n'est pas une estimation à 0h — voir unestimatedCount côté
// charge de travail) ; la valeur passe par parseLocaleNumber pour accepter
// "," comme séparateur décimal sous locale française.
const blankToUndefined = (v: unknown) => {
  if (v === '' || v === null || v === undefined) return undefined;
  return typeof v === 'string' ? parseLocaleNumber(v) : v;
};

const NO_MILESTONE = 'NONE';

const schema = z.object({
  title: z.string().min(1, 'Titre requis'),
  dueDate: z.string().optional(),
  estimatedHours: z.preprocess(blankToUndefined, z.coerce.number().min(0).max(1000).optional()),
  milestoneId: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function buildDefaultValues(task: Task): FormValues {
  return {
    title: task.title,
    dueDate: task.dueDate ? task.dueDate.slice(0, 10) : '',
    estimatedHours: task.estimatedHours ?? undefined,
    milestoneId: task.milestoneId ?? NO_MILESTONE,
  };
}

export function EditTaskDialog({ task }: { task: Task }) {
  const [open, setOpen] = useState(false);
  const updateTask = useUpdateTask();
  // Les jalons sont rattachés à un dossier — une tâche transversale (sans dealId) n'a pas de jalon possible.
  const { data: milestones = [] } = useMilestones(task.dealId ?? '');
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(task),
  });

  const onSubmit = (values: FormValues) => {
    updateTask.mutate(
      {
        id: task.id,
        title: values.title,
        dueDate: values.dueDate || undefined,
        estimatedHours: values.estimatedHours,
        milestoneId: values.milestoneId && values.milestoneId !== NO_MILESTONE ? values.milestoneId : null,
      },
      { onSuccess: () => setOpen(false) },
    );
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        setOpen(next);
        if (next) reset(buildDefaultValues(task));
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
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-dueDate">Échéance</Label>
              <Input id="task-dueDate" type="date" {...register('dueDate')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="task-estimatedHours">Estimation (heures)</Label>
              <DecimalInput id="task-estimatedHours" {...register('estimatedHours')} />
              {errors.estimatedHours && <p className="text-xs text-destructive">{errors.estimatedHours.message}</p>}
            </div>
          </div>
          {task.dealId && (
            <div className="flex flex-col gap-1.5">
              <Label>Jalon</Label>
              <Controller
                control={control}
                name="milestoneId"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={NO_MILESTONE}>Aucun jalon</SelectItem>
                      {milestones.map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </div>
          )}
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
