import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { formatDate } from '@/lib/format';
import { useFractionalDecisions, useCreateFractionalDecision } from '../hooks/use-fractional';

const EMPTY_FORM = { question: '', choice: '', motif: '' };

/**
 * Historique de décision (spec Cockpit/Fractionné P2 §6) — un vote humain
 * poursuivre/suspendre/abandonner (ou toute autre décision de comité),
 * horodaté et motivé, distinct d'un verdict algorithmique (onglet Risque &
 * IC) ou d'un changement mécanique de statut (spec §5.4).
 */
export function DecisionLogCard({ projectId }: { projectId: string }) {
  const { data: decisions } = useFractionalDecisions(projectId);
  const createDecision = useCreateFractionalDecision(projectId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    createDecision.mutate(form, {
      onSuccess: () => {
        setForm(EMPTY_FORM);
        setOpen(false);
      },
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Historique de décision</CardTitle>
        <Button size="sm" variant="outline" onClick={() => setOpen((o) => !o)}>
          <Plus className="h-3.5 w-3.5" />
          Journaliser une décision
        </Button>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {open && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-3 rounded-lg border border-border p-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decisionQuestion">Question tranchée</Label>
              <Input
                id="decisionQuestion"
                required
                placeholder="ex: Poursuivre le dossier malgré le retard de collecte ?"
                value={form.question}
                onChange={(e) => setForm((f) => ({ ...f, question: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decisionChoice">Choix</Label>
              <Input
                id="decisionChoice"
                required
                placeholder="ex: Poursuivre / Suspendre / Abandonner"
                value={form.choice}
                onChange={(e) => setForm((f) => ({ ...f, choice: e.target.value }))}
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="decisionMotif">Motif</Label>
              <Textarea id="decisionMotif" required rows={2} value={form.motif} onChange={(e) => setForm((f) => ({ ...f, motif: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
                Annuler
              </Button>
              <Button type="submit" size="sm" disabled={createDecision.isPending}>
                {createDecision.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                Enregistrer
              </Button>
            </div>
          </form>
        )}

        {decisions && decisions.length > 0 ? (
          <div className="flex flex-col gap-2">
            {decisions.map((d) => (
              <div key={d.id} className="border-b border-border/60 pb-2 last:border-b-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">{d.question}</p>
                  <span className="shrink-0 text-xs text-muted-foreground">{formatDate(d.decidedAt)}</span>
                </div>
                <p className="text-sm">
                  <span className="font-medium">{d.choice}</span> — {d.motif}
                </p>
                {d.decidedBy && (
                  <p className="text-xs text-muted-foreground">
                    {d.decidedBy.firstName} {d.decidedBy.lastName}
                  </p>
                )}
              </div>
            ))}
          </div>
        ) : (
          !open && <p className="text-sm text-muted-foreground">Aucune décision journalisée pour ce dossier.</p>
        )}
      </CardContent>
    </Card>
  );
}
