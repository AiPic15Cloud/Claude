import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateRelationship, useEntities, useRelationshipTypes } from '../hooks/use-graph';
import { EVIDENCE_LEVEL_LABELS, type EvidenceLevel } from '@/types';
import { ApiError } from '@/lib/api';

const schema = z.object({
  targetEntityId: z.string().min(1, 'Choisissez une entité'),
  typeKey: z.string().min(1, 'Choisissez un type'),
  amount: z.string().optional(),
  percentage: z.string().optional(),
  evidenceLevel: z.enum(['DECLARED', 'DOCUMENTED', 'OFFICIAL']),
  evidenceSource: z.string().min(2, 'Source requise'),
  evidenceReference: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

const DEFAULTS: FormValues = {
  targetEntityId: '',
  typeKey: '',
  amount: '',
  percentage: '',
  evidenceLevel: 'DECLARED',
  evidenceSource: '',
  evidenceReference: '',
};

/**
 * Déclare une relation entre deux entités du Knowledge Graph v2 (spec ATLAS
 * v2, B.3) — remplace l'ancien formulaire jamais construit (useCreateRelation
 * était mort). Une preuve minimale est obligatoire (section 0.2) : pas de
 * lien sans savoir d'où il vient, même déclaratif.
 */
export function CreateRelationshipDialog({ entityId }: { entityId: string }) {
  const [open, setOpen] = useState(false);
  const { data: entities } = useEntities({});
  const { data: types } = useRelationshipTypes();
  const createRelationship = useCreateRelationship();
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: DEFAULTS });

  const candidates = (entities ?? []).filter((e) => e.id !== entityId);

  const onSubmit = (values: FormValues) => {
    createRelationship.mutate(
      {
        sourceEntityId: entityId,
        targetEntityId: values.targetEntityId,
        typeKey: values.typeKey,
        amount: values.amount ? Number(values.amount) : undefined,
        percentage: values.percentage ? Number(values.percentage) : undefined,
        evidenceLevel: values.evidenceLevel as EvidenceLevel,
        evidenceSource: values.evidenceSource,
        evidenceReference: values.evidenceReference || undefined,
      },
      { onSuccess: () => { setOpen(false); reset(DEFAULTS); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Link2 className="h-3.5 w-3.5" /> Déclarer une relation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Déclarer une relation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Entité liée</Label>
            <Controller
              control={control}
              name="targetEntityId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir une entité" />
                  </SelectTrigger>
                  <SelectContent>
                    {candidates.map((e) => (
                      <SelectItem key={e.id} value={e.id}>
                        {e.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.targetEntityId && <p className="text-xs text-destructive">{errors.targetEntityId.message}</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label>Type de relation</Label>
            <Controller
              control={control}
              name="typeKey"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choisir un type" />
                  </SelectTrigger>
                  <SelectContent>
                    {(types ?? []).map((t) => (
                      <SelectItem key={t.key} value={t.key}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.typeKey && <p className="text-xs text-destructive">{errors.typeKey.message}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="amount">Montant (€, optionnel)</Label>
              <Input id="amount" type="number" step="0.01" {...register('amount')} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="percentage">Pourcentage (optionnel)</Label>
              <Input id="percentage" type="number" step="0.1" {...register('percentage')} />
            </div>
          </div>

          <div className="flex flex-col gap-1.5 rounded-md border border-border p-3">
            <p className="text-xs font-medium text-muted-foreground">
              Preuve — d'où vient cette information ? (obligatoire, jamais un lien sans source)
            </p>
            <Label>Niveau de preuve</Label>
            <Controller
              control={control}
              name="evidenceLevel"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.entries(EVIDENCE_LEVEL_LABELS) as [EvidenceLevel, string][]).map(([key, label]) => (
                      <SelectItem key={key} value={key}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            <Label htmlFor="evidenceSource">Source</Label>
            <Input id="evidenceSource" placeholder="ex: Kbis, déclaration de l'analyste, extrait BODACC..." {...register('evidenceSource')} />
            {errors.evidenceSource && <p className="text-xs text-destructive">{errors.evidenceSource.message}</p>}
            <Label htmlFor="evidenceReference">Référence (optionnel)</Label>
            <Input id="evidenceReference" placeholder="ex: numéro de document, URL..." {...register('evidenceReference')} />
          </div>

          {createRelationship.isError && (
            <p className="text-xs text-destructive">
              {createRelationship.error instanceof ApiError ? createRelationship.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createRelationship.isPending}>
              {createRelationship.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
