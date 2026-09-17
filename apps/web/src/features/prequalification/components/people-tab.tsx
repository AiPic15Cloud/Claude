import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency } from '@/lib/format';
import { useCreatePerson, useUpdatePerson, useDeletePerson } from '../hooks/use-prequalification';
import { PREQUAL_PERSON_ROLE_LABELS, type PrequalPerson, type PrequalPersonRole } from '@/types';

const ROLES = Object.keys(PREQUAL_PERSON_ROLE_LABELS) as PrequalPersonRole[];
const EMPTY_FORM = { fullName: '', role: 'PORTEUR_PRINCIPAL' as PrequalPersonRole, declaredNetWorth: '', availableEquity: '', ongoingDealsNote: '', incidentsNote: '' };

/** Porteurs (spec §5) : identité, patrimoine déclaré, apport disponible, encours et incidents connus. */
export function PeopleTab({ caseId, people }: { caseId: string; people: PrequalPerson[] }) {
  const create = useCreatePerson(caseId);
  const update = useUpdatePerson(caseId);
  const remove = useDeletePerson(caseId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startEdit = (p: PrequalPerson) => {
    setEditingId(p.id);
    setForm({
      fullName: p.fullName,
      role: p.role,
      declaredNetWorth: p.declaredNetWorth != null ? String(p.declaredNetWorth) : '',
      availableEquity: p.availableEquity != null ? String(p.availableEquity) : '',
      ongoingDealsNote: p.ongoingDealsNote ?? '',
      incidentsNote: p.incidentsNote ?? '',
    });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName) return;
    const payload = {
      fullName: form.fullName,
      role: form.role,
      declaredNetWorth: form.declaredNetWorth ? Number(form.declaredNetWorth) : undefined,
      availableEquity: form.availableEquity ? Number(form.availableEquity) : undefined,
      ongoingDealsNote: form.ongoingDealsNote || undefined,
      incidentsNote: form.incidentsNote || undefined,
    };
    if (editingId) {
      update.mutate({ personId: editingId, ...payload }, { onSuccess: () => cancelEdit() });
    } else {
      create.mutate(payload, { onSuccess: () => setForm(EMPTY_FORM) });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Porteurs</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {people.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nom</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>Patrimoine déclaré</TableHead>
                <TableHead>Apport disponible</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>{p.fullName}</TableCell>
                  <TableCell>{PREQUAL_PERSON_ROLE_LABELS[p.role]}</TableCell>
                  <TableCell>{p.declaredNetWorth != null ? formatCurrency(p.declaredNetWorth) : '—'}</TableCell>
                  <TableCell>{p.availableEquity != null ? formatCurrency(p.availableEquity) : '—'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(p)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(p.id)} disabled={remove.isPending}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}

        <form onSubmit={handleSubmit} className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Nom complet</Label>
              <Input value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as PrequalPersonRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {PREQUAL_PERSON_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Patrimoine déclaré</Label>
              <Input type="number" min={0} value={form.declaredNetWorth} onChange={(e) => setForm((p) => ({ ...p, declaredNetWorth: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Apport disponible</Label>
              <Input type="number" min={0} value={form.availableEquity} onChange={(e) => setForm((p) => ({ ...p, availableEquity: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Dossiers en cours</Label>
              <Input value={form.ongoingDealsNote} onChange={(e) => setForm((p) => ({ ...p, ongoingDealsNote: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Incidents connus</Label>
              <Input value={form.incidentsNote} onChange={(e) => setForm((p) => ({ ...p, incidentsNote: e.target.value }))} />
            </div>
          </div>
          <div className="flex gap-2">
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
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
