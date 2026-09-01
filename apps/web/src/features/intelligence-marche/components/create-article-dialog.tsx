import { useState } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, Controller } from 'react-hook-form';
import { z } from 'zod';
import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useSources, useCreateArticle } from '../hooks/use-market-intelligence';
import { ARTICLE_CATEGORY_LABELS, type ArticleCategory } from '@/types';

const CATEGORIES = Object.keys(ARTICLE_CATEGORY_LABELS) as ArticleCategory[];

const schema = z.object({
  sourceId: z.string().min(1, 'Source requise'),
  title: z.string().min(2, 'Titre requis'),
  summary: z.string().optional(),
  url: z.string().url().optional().or(z.literal('')),
  category: z.enum(CATEGORIES as [ArticleCategory, ...ArticleCategory[]]),
});
type FormValues = z.infer<typeof schema>;

export function CreateArticleDialog() {
  const [open, setOpen] = useState(false);
  const { data: sources = [] } = useSources();
  const createArticle = useCreateArticle();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema), defaultValues: { category: 'AUTRE' } });

  const onSubmit = (values: FormValues) => {
    createArticle.mutate(
      { ...values, url: values.url || undefined },
      { onSuccess: () => { setOpen(false); reset(); } },
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-4 w-4" /> Nouvelle actualité
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ajouter une actualité</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          <div className="flex flex-col gap-1.5">
            <Label>Source</Label>
            <Controller
              control={control}
              name="sourceId"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Sélectionner une source" />
                  </SelectTrigger>
                  <SelectContent>
                    {sources.map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.sourceId && <p className="text-xs text-destructive">{errors.sourceId.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="title">Titre</Label>
            <Input id="title" {...register('title')} />
            {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Catégorie</Label>
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {ARTICLE_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="summary">Résumé</Label>
            <Textarea id="summary" rows={3} {...register('summary')} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="url">Lien (optionnel)</Label>
            <Input id="url" placeholder="https://" {...register('url')} />
            {errors.url && <p className="text-xs text-destructive">{errors.url.message}</p>}
          </div>
          <DialogFooter>
            <Button type="submit" disabled={createArticle.isPending}>
              {createArticle.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Publier
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
