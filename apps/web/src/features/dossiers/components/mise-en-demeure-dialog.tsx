import { useState } from 'react';
import { Check, Copy, Loader2, ScrollText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useGenerateMiseEnDemeure } from '../hooks/use-mise-en-demeure';
import { ApiError } from '@/lib/api';

export function MiseEnDemeureDialog({ dealId }: { dealId: string }) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const generate = useGenerateMiseEnDemeure(dealId);

  const openAndGenerate = () => {
    setOpen(true);
    generate.mutate();
  };

  const copyBody = () => {
    if (!generate.data) return;
    navigator.clipboard.writeText(generate.data.body).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <>
      <Button size="sm" variant="outline" onClick={openAndGenerate}>
        <ScrollText className="h-3.5 w-3.5" /> Mise en demeure
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Générer une mise en demeure</DialogTitle>
            <DialogDescription>
              À copier dans votre modèle de courrier (LRAR) — rien n'est envoyé automatiquement.
            </DialogDescription>
          </DialogHeader>

          {generate.isPending && (
            <div className="flex items-center justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}

          {generate.isError && (
            <p className="text-xs text-destructive">
              {generate.error instanceof ApiError ? generate.error.message : 'Une erreur est survenue'}
            </p>
          )}

          {generate.data && (
            <div className="flex flex-col gap-3">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mise-en-demeure-subject">Objet</Label>
                <Input id="mise-en-demeure-subject" readOnly value={generate.data.subject} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="mise-en-demeure-body">Courrier</Label>
                <Textarea id="mise-en-demeure-body" readOnly rows={18} className="font-mono text-xs" value={generate.data.body} />
              </div>
              <DialogFooter>
                <Button type="button" size="sm" onClick={copyBody}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied ? 'Copié' : 'Copier le courrier'}
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
