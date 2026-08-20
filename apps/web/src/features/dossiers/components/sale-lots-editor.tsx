import { useState } from 'react';
import { Check, Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateSaleLot, useUpdateSaleLot, useDeleteSaleLot } from '../hooks/use-sale-lots';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import { SALE_LOT_STATUSES, SALE_LOT_STATUS_LABELS, type SaleLot, type SaleLotStatus } from '@/types';

interface DraftLot {
  id: string | null;
  label: string;
  surfaceSqm: string;
  salePrice: string;
}

const STATUS_DOT: Record<SaleLotStatus, string> = {
  EN_VENTE: 'bg-muted-foreground',
  OFFRE: 'bg-chart-3',
  PROMESSE_COMPROMIS: 'bg-warning',
  RESERVATION: 'bg-chart-accent',
  VENDU: 'bg-success',
};

function StatusSelect({ value, onChange, disabled }: { value: SaleLotStatus; onChange: (status: SaleLotStatus) => void; disabled?: boolean }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SaleLotStatus)} disabled={disabled}>
      <SelectTrigger className="h-7 w-auto gap-1.5 border-none bg-transparent px-2 text-xs shadow-none">
        <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', STATUS_DOT[value])} />
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {SALE_LOT_STATUSES.map((status) => (
          <SelectItem key={status} value={status}>
            {SALE_LOT_STATUS_LABELS[status]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

/**
 * Grille de commercialisation lot par lot — remplace le prix de vente moyen
 * (sellingPricePerSqm × surfaceSqm) par la somme des prix réels dès qu'au
 * moins un lot est saisi (FinancialModelService). Une moyenne peut masquer
 * qu'un projet n'est viable que si certains lots se vendent au-dessus du
 * marché — la grille rend ce risque visible lot par lot.
 */
export function SaleLotsEditor({ dealId, lots }: { dealId: string; lots: SaleLot[] }) {
  const [draft, setDraft] = useState<DraftLot | null>(null);
  const create = useCreateSaleLot(dealId);
  const update = useUpdateSaleLot(dealId);
  const remove = useDeleteSaleLot(dealId);

  const totalSurface = lots.reduce((sum, l) => sum + l.surfaceSqm, 0);
  const totalPrice = lots.reduce((sum, l) => sum + l.salePrice, 0);
  const avgPricePerSqm = totalSurface > 0 ? Math.round(totalPrice / totalSurface) : null;

  const startEdit = (lot: SaleLot) => setDraft({ id: lot.id, label: lot.label, surfaceSqm: String(lot.surfaceSqm), salePrice: String(lot.salePrice) });
  const startNew = () => setDraft({ id: null, label: '', surfaceSqm: '', salePrice: '' });
  const cancel = () => setDraft(null);

  const save = () => {
    if (!draft) return;
    const surfaceSqm = Number(draft.surfaceSqm);
    const salePrice = Number(draft.salePrice);
    if (!draft.label.trim() || !(surfaceSqm > 0) || !(salePrice > 0)) return;
    if (draft.id) {
      update.mutate({ lotId: draft.id, label: draft.label, surfaceSqm, salePrice }, { onSuccess: () => setDraft(null) });
    } else {
      create.mutate({ label: draft.label, surfaceSqm, salePrice }, { onSuccess: () => setDraft(null) });
    }
  };

  const changeStatus = (lot: SaleLot, status: SaleLotStatus) => update.mutate({ lotId: lot.id, status });

  const saving = create.isPending || update.isPending;

  return (
    <div className="flex flex-col gap-1.5">
      {lots.map((lot) =>
        draft?.id === lot.id ? (
          <div key={lot.id} className="flex flex-wrap items-center gap-1.5">
            <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Lot" className="min-w-[8rem] flex-1" />
            <Input
              type="number"
              step="any"
              value={draft.surfaceSqm}
              onChange={(e) => setDraft({ ...draft, surfaceSqm: e.target.value })}
              placeholder="Surface m²"
              className="w-24"
            />
            <Input
              type="number"
              step="any"
              value={draft.salePrice}
              onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })}
              placeholder="Prix (€)"
              className="w-32"
            />
            <Button size="icon" variant="ghost" onClick={save} disabled={saving}>
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5 text-success" />}
            </Button>
            <Button size="icon" variant="ghost" onClick={cancel}>
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </div>
        ) : (
          <div key={lot.id} className="flex items-center justify-between gap-2 rounded-md border border-border px-3 py-1.5">
            <div className="flex items-center gap-2">
              <StatusSelect value={lot.status} onChange={(status) => changeStatus(lot, status)} disabled={update.isPending} />
              <span className="text-sm">{lot.label}</span>
              <span className="text-xs text-muted-foreground">{lot.surfaceSqm} m²</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-sm font-medium tabular-nums">{formatCurrency(lot.salePrice)}</span>
              <Button size="icon" variant="ghost" onClick={() => startEdit(lot)}>
                <Pencil className="h-3 w-3 text-muted-foreground" />
              </Button>
              <Button size="icon" variant="ghost" onClick={() => remove.mutate(lot.id)} disabled={remove.isPending}>
                <Trash2 className="h-3 w-3 text-muted-foreground" />
              </Button>
            </div>
          </div>
        ),
      )}
      {draft?.id === null && (
        <div className="flex flex-wrap items-center gap-1.5">
          <Input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} placeholder="Ex. Lot 1 — T2" className="min-w-[8rem] flex-1" autoFocus />
          <Input
            type="number"
            step="any"
            value={draft.surfaceSqm}
            onChange={(e) => setDraft({ ...draft, surfaceSqm: e.target.value })}
            placeholder="Surface m²"
            className="w-24"
          />
          <Input
            type="number"
            step="any"
            value={draft.salePrice}
            onChange={(e) => setDraft({ ...draft, salePrice: e.target.value })}
            placeholder="Prix (€)"
            className="w-32"
          />
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
          <Plus className="h-3.5 w-3.5" /> Ajouter un lot
        </Button>
      )}
      {lots.length > 0 && (
        <div className="mt-1 flex items-center justify-between border-t border-border pt-1.5 text-sm">
          <span className="font-medium">
            Total grille ({lots.length} lot{lots.length > 1 ? 's' : ''}, {totalSurface} m²{avgPricePerSqm !== null ? ` · ${formatCurrency(avgPricePerSqm)}/m² moyen` : ''})
          </span>
          <span className="font-semibold tabular-nums">{formatCurrency(totalPrice)}</span>
        </div>
      )}
      {lots.length === 0 && (
        <p className="text-xs text-muted-foreground">
          Tant qu'aucun lot n'est saisi, le prix de vente reste calculé sur la moyenne ci-dessus (€/m² × surface).
        </p>
      )}
    </div>
  );
}
