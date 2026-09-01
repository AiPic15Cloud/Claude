import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useConnectors, useCreateSource } from '../hooks/use-market-intelligence';

const schema = z.object({
  name: z.string().min(2, 'Nom requis'),
  connector: z.string().min(1, 'Connecteur requis'),
  url: z.string().optional(),
});
type FormValues = z.infer<typeof schema>;

export function CreateSourceDialog() {
  const [open, setOpen] = useState(false);
  const { data: connectors = [] } = useConnectors();
  const createSource = useCreateSource();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { name: '', connector: '', url: '' } });

  const connector = watch('connector');

  const onSubmit = (values: FormValues) => {
    createSource.mutate(
      { name: values.name, connector: values.connector, url: values.url || undefined, active: true },
      { onSuccess: () => { setOpen(false); reset(); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Plus className="h-4 w-4" /> Ajouter une source
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une source de veille</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="name">Nom</Label>
            <Input id="name" placeholder="Ex. Oaktree Capital — Memos" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Connecteur</Label>
            <Controller
              control={control}
              name="connector"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner un connecteur" />
                  </SelectTrigger>
                  <SelectContent>
                    {connectors.map((c) => (
                      <SelectItem key={c.key} value={c.key}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.connector && <p className="text-xs text-destructive">{errors.connector.message}</p>}
          </div>
          {connector && connector !== 'manual' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="url">{connector === 'data-gouv' ? 'Requête de recherche' : 'URL du flux'}</Label>
              <Input
                id="url"
                placeholder={connector === 'data-gouv' ? 'Ex. permis de construire Île-de-France' : 'https://...'}
                {...register('url')}
              />
              <p className="text-xs text-muted-foreground">
                {connector === 'press-rss' && "Coller l'URL du flux RSS/Atom de la source (ex. section presse ou investisseurs)."}
                {connector === 'google-news' && 'Mot-clé ou requête Google News à suivre.'}
                {connector === 'data-gouv' && 'Terme recherché sur data.gouv.fr.'}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button type="submit" disabled={createSource.isPending}>
              {createSource.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Ajouter
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
