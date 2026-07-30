import { useEffect, useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateEntity, useUpdateEntity } from '../hooks/use-graph';
import { GRAPH_ENTITY_TYPE_LABELS, type GraphEntity, type GraphEntityType } from '@/types';
import { ApiError } from '@/lib/api';

const TYPES: GraphEntityType[] = ['PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'PLATEFORME'];

const schema = z.object({
  type: z.enum(['PROMOTEUR', 'BANQUE', 'NOTAIRE', 'ARCHITECTE', 'COLLECTIVITE', 'INVESTISSEUR', 'PLATEFORME']),
  name: z.string().min(2, 'Nom requis'),
  contactName: z.string().optional(),
  email: z.string().email('Email invalide').optional().or(z.literal('')),
  phone: z.string().optional(),
  city: z.string().optional(),
  website: z.string().url("URL invalide").optional().or(z.literal('')),
  description: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

function toDefaults(entity?: GraphEntity | null): FormValues {
  return {
    type: entity?.type ?? 'PROMOTEUR',
    name: entity?.name ?? '',
    contactName: entity?.contactName ?? '',
    email: entity?.email ?? '',
    phone: entity?.phone ?? '',
    city: entity?.city ?? '',
    website: entity?.website ?? '',
    description: entity?.description ?? '',
  };
}

/** Create/edit form for a Knowledge Graph entity (also the Répertoire's contact card) — pass `entity` to edit it in place. */
export function CreateEntityDialog({ entity, trigger }: { entity?: GraphEntity; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const create = useCreateEntity();
  const update = useUpdateEntity();
  const isEdit = Boolean(entity);
  const mutation = isEdit ? update : create;
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: toDefaults(entity) });

  useEffect(() => {
    if (open) reset(toDefaults(entity));
  }, [open, entity, reset]);

  const onSubmit = (values: FormValues) => {
    const payload = {
      ...values,
      contactName: values.contactName || undefined,
      email: values.email || undefined,
      phone: values.phone || undefined,
      website: values.website || undefined,
      description: values.description || undefined,
    };
    if (isEdit && entity) {
      update.mutate({ id: entity.id, ...payload }, { onSuccess: () => setOpen(false) });
    } else {
      create.mutate(payload, { onSuccess: () => { setOpen(false); reset(toDefaults()); } });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant={isEdit ? 'outline' : 'default'}>
            {isEdit ? <Pencil className="h-3.5 w-3.5" /> : <Plus className="h-4 w-4" />}
            {isEdit ? 'Modifier' : 'Nouvelle fiche'}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Modifier la fiche' : 'Nouvelle fiche contact'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Type</Label>
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {GRAPH_ENTITY_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom (société / structure)</Label>
            <Input id="name" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="contactName">Nom du contact</Label>
            <Input id="contactName" placeholder="ex: Jean Dupont" {...register('contactName')} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" {...register('email')} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="phone">Téléphone</Label>
              <Input id="phone" {...register('phone')} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="city">Ville</Label>
              <Input id="city" {...register('city')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="website">Site web</Label>
              <Input id="website" placeholder="https://" {...register('website')} />
              {errors.website && <p className="text-xs text-destructive">{errors.website.message}</p>}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="description">Notes</Label>
            <Textarea id="description" rows={2} {...register('description')} />
          </div>
          {mutation.isError && (
            <p className="text-xs text-destructive">
              {mutation.error instanceof ApiError ? mutation.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={mutation.isPending}>
              {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEdit ? 'Enregistrer' : 'Créer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
