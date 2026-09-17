import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import { useCreateLot, useUpdateLot, useDeleteLot } from '../hooks/use-prequalification';
import { PREQUAL_LOT_STATUS_LABELS, type PrequalSalesLot, type PrequalLotStatus } from '@/types';

const STATUSES = Object.keys(PREQUAL_LOT_STATUS_LABELS) as PrequalLotStatus[];
const EMPTY_FORM = { label: '', surfaceSqm: '', askingPrice: '', expectedPrice: '', status: 'NOT_MARKETED' as PrequalLotStatus };

/** Lots à commercialiser (spec §8) — le CA recalculé du bilan financier dépend de ces prix, tout ajout déclenche un recalcul côté serveur. */
export function LotsTab({ caseId, lots }: { caseId: string; lots: PrequalSalesLot[] }) {
  const create = useCreateLot(caseId);
  const update = useUpdateLot(caseId);
  const remove = useDeleteLot(caseId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startEdit = (lot: PrequalSalesLot) => {
    setEditingId(lot.id);
    setForm({
      label: lot.label,
      surfaceSqm: lot.surfaceSqm != null ? String(lot.surfaceSqm) : '',
      askingPrice: lot.askingPrice != null ? String(lot.askingPrice) : '',
      expectedPrice: lot.expectedPrice != null ? String(lot.expectedPrice) : '',
      status: lot.status,
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.label) return;
    const payload = {
      label: form.label,
      surfaceSqm: form.surfaceSqm ? Number(form.surfaceSqm) : undefined,
      askingPrice: form.askingPrice ? Number(form.askingPrice) : undefined,
      expectedPrice: form.expectedPrice ? Number(form.expectedPrice) : undefined,
      status: form.status,
    };
    if (editingId) {
      update.mutate({ lotId: editingId, ...payload }, { onSuccess: () => cancelEdit() });
    } else {
      create.mutate(payload, { onSuccess: () => setForm(EMPTY_FORM) });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Lots à commercialiser</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {lots.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lot</TableHead>
                <TableHead>Surface</TableHead>
                <TableHead>Prix affiché</TableHead>
                <TableHead>Prix attendu</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {lots.map((lot) => (
                <TableRow key={lot.id}>
                  <TableCell>{lot.label}</TableCell>
                  <TableCell>{lot.surfaceSqm != null ? `${lot.surfaceSqm} m²` : '—'}</TableCell>
                  <TableCell>{lot.askingPrice != null ? formatCurrency(lot.askingPrice) : '—'}</TableCell>
                  <TableCell>{lot.expectedPrice != null ? formatCurrency(lot.expectedPrice) : '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PREQUAL_LOT_STATUS_LABELS[lot.status]}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(lot)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(lot.id)} disabled={remove.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1.5">
            <Label>Lot</Label>
            <Input className="w-40" value={form.label} onChange={(e) => setForm((p) => ({ ...p, label: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Surface (m²)</Label>
            <Input type="number" min={0} className="w-28" value={form.surfaceSqm} onChange={(e) => setForm((p) => ({ ...p, surfaceSqm: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Prix affiché</Label>
            <Input type="number" min={0} className="w-36" value={form.askingPrice} onChange={(e) => setForm((p) => ({ ...p, askingPrice: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Prix attendu</Label>
            <Input type="number" min={0} className="w-36" value={form.expectedPrice} onChange={(e) => setForm((p) => ({ ...p, expectedPrice: e.target.value }))} />
          </div>
          <div className="flex flex-col gap-1.5">
            <Label>Statut</Label>
            <Select value={form.status} onValueChange={(v) => setForm((p) => ({ ...p, status: v as PrequalLotStatus }))}>
              <SelectTrigger className="w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {PREQUAL_LOT_STATUS_LABELS[s]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button type="submit" size="sm" disabled={create.isPending || update.isPending}>
            {create.isPending || update.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : editingId ? <Pencil className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {editingId ? 'Enregistrer' : 'Ajouter'}
          </Button>
          {editingId && (
            <Button type="button" variant="ghost" size="sm" onClick={cancelEdit}>
              <X className="h-4 w-4" />
              Annuler
            </Button>
          )}
        </form>
      </CardContent>
    </Card>
  );
}
