import { useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreatePrequalificationCase } from '../hooks/use-prequalification';
import { ApiError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';
import { PREQUALIFICATION_PROJECT_TYPE_LABELS, type PrequalificationProjectType } from '@/types';

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  entryChannel: z.string().optional(),
  introducer: z.string().optional(),
  projectType: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const PROJECT_TYPES = Object.keys(PREQUALIFICATION_PROJECT_TYPE_LABELS) as PrequalificationProjectType[];

/** Ouverture d'un dossier de préqualification (spec §16.1 — sas avant Portefeuille). */
export function CreateCaseDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const create = useCreatePrequalificationCase();
  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '' } });

  const onSubmit = (values: FormValues) => {
    create.mutate(
      { ...values, projectType: (values.projectType as PrequalificationProjectType) || undefined },
      {
        onSuccess: (created) => {
          setOpen(false);
          reset();
          navigate(`/prequalification/${created.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouveau dossier
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier de préqualification</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="ex: Division parcellaire — Villeurbanne" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="entryChannel">Canal d'entrée</Label>
              <Input id="entryChannel" placeholder="ex: apporteur, direct" {...register('entryChannel')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="introducer">Apporteur</Label>
              <Input id="introducer" {...register('introducer')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Typologie de projet</Label>
            <Controller
              control={control}
              name="projectType"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Non renseigné" />
                  </SelectTrigger>
                  <SelectContent>
                    {PROJECT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {PREQUALIFICATION_PROJECT_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          {create.isError && (
            <p className="text-xs text-destructive">{create.error instanceof ApiError ? create.error.message : 'Une erreur est survenue'}</p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={create.isPending}>
              {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Créer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
