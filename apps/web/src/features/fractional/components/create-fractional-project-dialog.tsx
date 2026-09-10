import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateFractionalProject } from '../hooks/use-fractional';
import { ApiError } from '@/lib/api';
import { useNavigate } from 'react-router-dom';

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  reference: z.string().min(2, 'Référence requise'),
  groupKey: z.string().optional(),
  perimeterLabel: z.string().optional(),
  city: z.string().optional(),
  address: z.string().optional(),
  postcode: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

/** Création d'un dossier Fractionné (spec V3 §1/§22 — un FractionalProject par périmètre, groupKey pour les relier). */
export function CreateFractionalProjectDialog() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const create = useCreateFractionalProject();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', reference: '' } });

  const onSubmit = (values: FormValues) => {
    create.mutate(
      { ...values, groupKey: values.groupKey || undefined, perimeterLabel: values.perimeterLabel || undefined },
      {
        onSuccess: (project) => {
          setOpen(false);
          reset();
          navigate(`/fractional/${project.id}`);
        },
      },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" />
          Nouveau dossier Fractionné
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nouveau dossier Fractionné</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="ex: Parc Le 149 — Meyzieu" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="reference">Référence</Label>
            <Input id="reference" placeholder="ex: MEYZIEU-PARC-SEUL" {...register('reference')} />
            {errors.reference && <p className="text-xs text-destructive">{errors.reference.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="groupKey">Groupe de périmètre</Label>
              <Input id="groupKey" placeholder="ex: meyzieu-149" {...register('groupKey')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="perimeterLabel">Périmètre</Label>
              <Input id="perimeterLabel" placeholder="ex: Parc seul" {...register('perimeterLabel')} />
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="city">Ville</Label>
            <Input id="city" {...register('city')} />
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
