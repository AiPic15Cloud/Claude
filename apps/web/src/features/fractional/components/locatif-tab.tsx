import { useState } from 'react';
import { Loader2, Plus, Trash2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { useCreateLease, useDeleteLease } from '../hooks/use-fractional';
import { FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS, LEASE_SECURITY_STATUS_LABELS, type FractionalLease, type FractionalLeaseRenewalStatus, type LeaseAssessment } from '@/types';

const RENEWAL_STATUSES: FractionalLeaseRenewalStatus[] = ['SIGNE', 'EN_COURS', 'TACITE', 'DEPASSE', 'CONTESTE'];
const SECURITY_VARIANT = { SECURED: 'success', WATCH: 'warning', SECURE_BEFORE_ACQUISITION: 'warning', EXCLUDE_FROM_SECURED_YIELD: 'destructive' } as const;

interface LeaseFormState {
  tenantName: string;
  loyerFacialAnnuel: string;
  dateEffet: string;
  dateTerme: string;
  statutRenouvellement: FractionalLeaseRenewalStatus;
}

const EMPTY_FORM: LeaseFormState = { tenantName: '', loyerFacialAnnuel: '', dateEffet: '', dateTerme: '', statutRenouvellement: 'SIGNE' };

/** Onglet Locatif (spec V3 §7) — rent roll + statut de sécurisation issu du Lease Security Engine (calculé côté API, jamais stocké). */
export function LocatifTab({ projectId, leases, leaseAssessments }: { projectId: string; leases: FractionalLease[]; leaseAssessments?: LeaseAssessment[] }) {
  const [form, setForm] = useState<LeaseFormState>(EMPTY_FORM);
  const create = useCreateLease(projectId);
  const del = useDeleteLease(projectId);

  const assessmentByLeaseId = new Map((leaseAssessments ?? []).map((a) => [a.leaseId, a]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    create.mutate(
      { tenantName: form.tenantName, loyerFacialAnnuel: Number(form.loyerFacialAnnuel), dateEffet: form.dateEffet, dateTerme: form.dateTerme, statutRenouvellement: form.statutRenouvellement },
      { onSuccess: () => setForm(EMPTY_FORM) },
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Rent roll</CardTitle>
        </CardHeader>
        <CardContent>
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">Aucun bail saisi.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Loyer facial annuel</TableHead>
                  <TableHead>Terme</TableHead>
                  <TableHead>Renouvellement</TableHead>
                  <TableHead>Statut de sécurisation</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const assessment = assessmentByLeaseId.get(lease.id);
                  return (
                    <TableRow key={lease.id}>
                      <TableCell>{lease.tenantName}</TableCell>
                      <TableCell>{formatCurrency(lease.loyerFacialAnnuel)}</TableCell>
                      <TableCell>{formatDate(lease.dateTerme)}</TableCell>
                      <TableCell>{FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS[lease.statutRenouvellement]}</TableCell>
                      <TableCell>
                        {assessment ? (
                          <span title={assessment.reasons.join(' · ')}>
                            <Badge variant={SECURITY_VARIANT[assessment.securityStatus]}>{LEASE_SECURITY_STATUS_LABELS[assessment.securityStatus]}</Badge>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" onClick={() => del.mutate(lease.id)} disabled={del.isPending}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajouter un bail</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="tenantName">Locataire</Label>
                <Input id="tenantName" required value={form.tenantName} onChange={(e) => setForm((p) => ({ ...p, tenantName: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="loyerFacialAnnuel">Loyer facial annuel</Label>
                <Input
                  id="loyerFacialAnnuel"
                  type="number"
                  min={0}
                  required
                  value={form.loyerFacialAnnuel}
                  onChange={(e) => setForm((p) => ({ ...p, loyerFacialAnnuel: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateEffet">Date d'effet</Label>
                <Input id="dateEffet" type="date" required value={form.dateEffet} onChange={(e) => setForm((p) => ({ ...p, dateEffet: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="dateTerme">Date de terme</Label>
                <Input id="dateTerme" type="date" required value={form.dateTerme} onChange={(e) => setForm((p) => ({ ...p, dateTerme: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Statut de renouvellement</Label>
                <Select value={form.statutRenouvellement} onValueChange={(v) => setForm((p) => ({ ...p, statutRenouvellement: v as FractionalLeaseRenewalStatus }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {RENEWAL_STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Button type="submit" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter le bail
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
