import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Target } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useSetFeesTarget } from '../hooks/use-fees';
import { ApiError } from '@/lib/api';

const schema = z.object({ targetAmount: z.coerce.number().min(0, 'Montant requis') });
type FormValues = z.infer<typeof schema>;

export function EditFeesTargetDialog({ year, currentTarget }: { year: number; currentTarget: number | null }) {
  const [open, setOpen] = useState(false);
  const setTarget = useSetFeesTarget();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { targetAmount: currentTarget ?? undefined } });

  const onSubmit = (values: FormValues) => {
    setTarget.mutate({ year, targetAmount: values.targetAmount }, { onSuccess: () => setOpen(false) });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Target className="h-3.5 w-3.5" />
          Objectif {year}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Objectif annuel de fees {year}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="targetAmount">Objectif (€)</Label>
            <Input id="targetAmount" type="number" min={0} step={1000} {...register('targetAmount')} />
            {errors.targetAmount && <p className="text-xs text-destructive">{errors.targetAmount.message}</p>}
          </div>
          {setTarget.isError && (
            <p className="text-xs text-destructive">
              {setTarget.error instanceof ApiError ? setTarget.error.message : 'Une erreur est survenue'}
            </p>
          )}
          <DialogFooter>
            <Button type="submit" disabled={setTarget.isPending}>
              {setTarget.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
