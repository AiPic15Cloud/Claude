import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateMilestone, useUpdateMilestone } from '../hooks/use-milestones';
import { ApiError } from '@/lib/api';
import type { PortfolioMilestone } from '@/types';

const schema = z.object({
  label: z.string().min(1, 'Libellé requis'),
  description: z.string().optional(),
  targetDate: z.string().optional(),
  blocking: z.boolean().optional(),
});
type FormValues = z.infer<typeof schema>;

function toDateInput(value?: string | null) {
  if (!value) return '';
  return value.slice(0, 10);
}

function buildDefaultValues(milestone?: PortfolioMilestone): FormValues {
  return milestone
    ? {
        label: milestone.label,
        description: milestone.description ?? '',
        targetDate: toDateInput(milestone.targetDate),
        blocking: milestone.blocking,
      }
    : { label: '', description: '', targetDate: '', blocking: false };
}

interface MilestoneFormDialogProps {
  dealId: string;
  // Omit for "add", pass the existing row for "edit" — same form either way.
  milestone?: PortfolioMilestone;
  nextOrder?: number;
}

export function MilestoneFormDialog({ dealId, milestone, nextOrder }: MilestoneFormDialogProps) {
  const isEdit = Boolean(milestone);
  const [open, setOpen] = useState(false);
  const createMilestone = useCreateMilestone(dealId);
  const updateMilestone = useUpdateMilestone(dealId);
  const mutation = isEdit ? updateMilestone : createMilestone;

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: buildDefaultValues(milestone),
  });

  // Le composant n'est pas démonté entre deux ouvertures (Radix masque juste le
  // DialogContent) : sans ce reset, rouvrir le dialogue d'édition après un
  // enregistrement réussi réaffichait les valeurs d'avant la sauvegarde.
  useEffect(() => {
    if (open) reset(buildDefaultValues(milestone));
  }, [open, milestone, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = { ...values, description: values.description || undefined, targetDate: values.targetDate || undefined };
    if (isEdit && milestone) {
      updateMilestone.mutate({ id: milestone.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      createMilestone.mutate({ ...payload, order: nextOrder }, { onSuccess: () => { setOpen(false); reset(); } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon" onClick={(e) => e.stopPropagation()}>
            <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        ) : (
          <Button size="sm" variant="outline">
            <Plus className="h-3.5 w-3.5" /> Nouveau jalon
          </Button>
        )}
      </DialogTrigger>
      <DialogContent onClick={(e) => e.stopPropagation()}>
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier le jalon' : 'Nouveau jalon'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-label">Libellé</Label>
            <Input id="milestone-label" {...register('label')} />
            {errors.label && <p className="text-xs text-destructive">{errors.label.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-description">Description</Label>
            <Textarea id="milestone-description" rows={2} {...register('description')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="milestone-targetDate">Date cible</Label>
            <Input id="milestone-targetDate" type="date" {...register('targetDate')} />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <Label htmlFor="milestone-blocking" className="cursor-pointer">Jalon bloquant</Label>
              <p className="text-xs text-muted-foreground">Tant qu'il n'est pas résolu, il plafonne l'avancement affiché du dossier.</p>
            </div>
            <Controller
              control={control}
              name="blocking"
              render={({ field }) => <Switch id="milestone-blocking" checked={field.value ?? false} onCheckedChange={field.onChange} />}
            />
          </div>
          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
