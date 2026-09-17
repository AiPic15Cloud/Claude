import { useState } from 'react';
import { Loader2, Plus, Pencil, Trash2, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { useCreateCompany, useUpdateCompany, useDeleteCompany } from '../hooks/use-prequalification';
import { PREQUAL_COMPANY_ROLE_LABELS, PREQUAL_COMPANY_STATE_LABELS, type PrequalCompany, type PrequalCompanyRole, type PrequalCompanyState } from '@/types';

const ROLES = Object.keys(PREQUAL_COMPANY_ROLE_LABELS) as PrequalCompanyRole[];
const STATES = Object.keys(PREQUAL_COMPANY_STATE_LABELS) as PrequalCompanyState[];
const EMPTY_FORM = { legalName: '', siren: '', role: 'OPERATEUR' as PrequalCompanyRole, state: 'INCONNUE' as PrequalCompanyState, accountsAvailable: false, knownDebtNote: '' };

/** Sociétés (spec §6) : opérateur, société de projet, garanties, état légal, comptes disponibles, dette connue. */
export function CompaniesTab({ caseId, companies }: { caseId: string; companies: PrequalCompany[] }) {
  const create = useCreateCompany(caseId);
  const update = useUpdateCompany(caseId);
  const remove = useDeleteCompany(caseId);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(EMPTY_FORM);

  const startEdit = (c: PrequalCompany) => {
    setEditingId(c.id);
    setForm({ legalName: c.legalName, siren: c.siren ?? '', role: c.role, state: c.state, accountsAvailable: c.accountsAvailable, knownDebtNote: c.knownDebtNote ?? '' });
  };
  const cancelEdit = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.legalName) return;
    const payload = {
      legalName: form.legalName,
      siren: form.siren || undefined,
      role: form.role,
      state: form.state,
      accountsAvailable: form.accountsAvailable,
      knownDebtNote: form.knownDebtNote || undefined,
    };
    if (editingId) {
      update.mutate({ companyId: editingId, ...payload }, { onSuccess: () => cancelEdit() });
    } else {
      create.mutate(payload, { onSuccess: () => setForm(EMPTY_FORM) });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Sociétés</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {companies.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Raison sociale</TableHead>
                <TableHead>SIREN</TableHead>
                <TableHead>Rôle</TableHead>
                <TableHead>État</TableHead>
                <TableHead>Comptes</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {companies.map((c) => (
                <TableRow key={c.id}>
                  <TableCell>{c.legalName}</TableCell>
                  <TableCell>{c.siren ?? '—'}</TableCell>
                  <TableCell>{PREQUAL_COMPANY_ROLE_LABELS[c.role]}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{PREQUAL_COMPANY_STATE_LABELS[c.state]}</Badge>
                  </TableCell>
                  <TableCell>{c.accountsAvailable ? 'Disponibles' : 'Non disponibles'}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" size="icon" onClick={() => startEdit(c)}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => remove.mutate(c.id)} disabled={remove.isPending}>
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
              <Label>Raison sociale</Label>
              <Input value={form.legalName} onChange={(e) => setForm((p) => ({ ...p, legalName: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>SIREN</Label>
              <Input value={form.siren} onChange={(e) => setForm((p) => ({ ...p, siren: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Rôle</Label>
              <Select value={form.role} onValueChange={(v) => setForm((p) => ({ ...p, role: v as PrequalCompanyRole }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {PREQUAL_COMPANY_ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>État</Label>
              <Select value={form.state} onValueChange={(v) => setForm((p) => ({ ...p, state: v as PrequalCompanyState }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => (
                    <SelectItem key={s} value={s}>
                      {PREQUAL_COMPANY_STATE_LABELS[s]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5 sm:col-span-2">
              <Label>Dette connue</Label>
              <Input value={form.knownDebtNote} onChange={(e) => setForm((p) => ({ ...p, knownDebtNote: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2 self-end pb-1.5">
              <Switch checked={form.accountsAvailable} onCheckedChange={(v) => setForm((p) => ({ ...p, accountsAvailable: v }))} />
              <Label>Comptes disponibles</Label>
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
