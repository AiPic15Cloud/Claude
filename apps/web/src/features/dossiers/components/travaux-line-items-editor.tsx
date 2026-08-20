import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useCreateCostLineItem, useUpdateCostLineItem, useDeleteCostLineItem } from '../hooks/use-cost-line-items';
import { formatCurrency } from '@/lib/format';
import type { CostLineItem } from '@/types';

interface DraftItem {
  id: string | null; // null = nouveau poste pas encore enregistré
  label: string;
  amount: string;
}

/**
 * Postes de travaux libres — l'utilisateur les saisit ligne par ligne dans
 * son classeur réel (pas des champs fixes) : ajouter/renommer/supprimer un
 * poste, chaque action persistée immédiatement et tracée dans l'historique
 * des valeurs (FieldChangeService côté API).
 */
export function TravauxLineItemsEditor({ dealId, items }: { dealId: string; items: CostLineItem[] }) {
  const [draft, setDraft] = useState<DraftItem | null>(null);
  const create = useCreateCostLineItem(dealId);
  const update = useUpdateCostLineItem(dealId);
  const remove = useDeleteCostLineItem(dealId);

  const total = items.reduce((sum, i) => sum + i.amount, 0);

  const startEdit = (item: CostLineItem) => setDraft({ id: item.id, label: item.label, amount: String(item.amount) });
  const startNew = () => setDraft({ id: null, label: '', amount: '' });
  const cancel = () => setDraft(null);

  const save = () => {
    if (!draft) return;
    const amount = Number(draft.amount);
    if (!draft.label.trim() || Number.isNaN(amount)) return;
    if (draft.id) {
      update.mutate({ itemId: draft.id, label: draft.label, amount }, { onSuccess: () => setDraft(null) });
    } else {
      create.mutate({ label: draft.label, amount }, { onSuccess: () => setDraft(null) });
    }
  };

  const saving = create.isPending || update.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      {items.map((item) =>
        draft?.id === item.id ? (
          <div key={item.id} className="flex items-center gap-1.5">
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Poste" className="flex-1" />
            <Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Montant" className="w-32" />
            <Button size="icon" variant="ghost" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-success" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={cancel}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div key={item.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
            <span className="text-sm">{item.label}</span>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium tabular-nums">{formatCurrency(item.amount)}</span>
              <Button size="icon" variant="ghost" onClick={() => startEdit(item)}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(item.id)} disabled={remove.isPending}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ),
      )}
      {draft?.id === null && (
        <div className="flex items-center gap-1.5">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Ex. Gros œuvre" className="flex-1" autoFocus />
          <Input type="number" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })} placeholder="Montant" className="w-32" />
          <Button size="icon" variant="ghost" onClick={save} disabled={saving}>
            {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-success" />}
          </Button>
          <Button size="icon" variant="ghost" onClick={cancel}>
            <X className="h-3.5 w-3.5 text-muted-foreground" />
          </Button>
        </div>
      )}
      {!draft && (
        <Button size="sm" variant="outline" className="self-start" onClick={startNew}>
          <Plus className="h-3.5 w-3.5" /> Ajouter un poste
        </Button>
      )}
      <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm">
        <span className="font-medium">Total travaux</span>
        <span className="font-semibold tabular-nums">{formatCurrency(total)}</span>
      </div>
    </div>
  );
}
