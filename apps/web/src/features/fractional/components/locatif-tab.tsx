import { useState } from 'react';
import { Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { useCreateLease, useUpdateLease, useDeleteLease, useFractionalLegalReview } from '../hooks/use-fractional';
import {
  FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS,
  LEASE_SECURITY_STATUS_LABELS,
  type FractionalLease,
  type FractionalLeaseRenewalStatus,
  type FractionalIndexationType,
  type LeaseAssessment,
} from '@/types';

const RENEWAL_STATUSES: FractionalLeaseRenewalStatus[] = ['SIGNE', 'EN_COURS', 'TACITE', 'DEPASSE', 'CONTESTE'];
const INDEXATION_TYPES: FractionalIndexationType[] = ['ILC', 'ILAT', 'IRL', 'ICC', 'AUTRE'];
const SECURITY_VARIANT = { SECURED: 'success', WATCH: 'warning', SECURE_BEFORE_ACQUISITION: 'warning', EXCLUDE_FROM_SECURED_YIELD: 'destructive' } as const;
const LEGAL_SEVERITY_VARIANT = { INFO: 'outline', WATCH: 'warning', ALERT: 'warning', CRITIQUE: 'destructive' } as const;
const LEGAL_SEVERITY_LABELS = { INFO: 'Info', WATCH: 'À surveiller', ALERT: 'Alerte', CRITIQUE: 'Critique' } as const;

interface LeaseFormState {
  tenantName: string;
  loyerFacialAnnuel: string;
  dateEffet: string;
  dateTerme: string;
  statutRenouvellement: FractionalLeaseRenewalStatus;
  sirenLocataire: string;
  procedureCollective: boolean;
  garantieMaisonMere: boolean;
  caLocataireAnnuel: string;
  ebitdaLocataireAnnuel: string;
  tresorerieLocataire: string;
  exerciceFinancierAsOf: string;
  indexation: FractionalIndexationType;
  indexationCapPct: string;
  indexationFloorPct: string;
}

const EMPTY_FORM: LeaseFormState = {
  tenantName: '',
  loyerFacialAnnuel: '',
  dateEffet: '',
  dateTerme: '',
  statutRenouvellement: 'SIGNE',
  sirenLocataire: '',
  procedureCollective: false,
  garantieMaisonMere: false,
  caLocataireAnnuel: '',
  ebitdaLocataireAnnuel: '',
  tresorerieLocataire: '',
  exerciceFinancierAsOf: '',
  indexation: 'AUTRE',
  indexationCapPct: '',
  indexationFloorPct: '',
};

function toDateInputValue(value: string | null | undefined): string {
  return value ? value.slice(0, 10) : '';
}

function leaseToFormState(lease: FractionalLease): LeaseFormState {
  return {
    tenantName: lease.tenantName,
    loyerFacialAnnuel: String(lease.loyerFacialAnnuel),
    dateEffet: toDateInputValue(lease.dateEffet),
    dateTerme: toDateInputValue(lease.dateTerme),
    statutRenouvellement: lease.statutRenouvellement,
    sirenLocataire: lease.sirenLocataire ?? '',
    procedureCollective: lease.procedureCollective,
    garantieMaisonMere: lease.garantieMaisonMere,
    caLocataireAnnuel: lease.caLocataireAnnuel !== null && lease.caLocataireAnnuel !== undefined ? String(lease.caLocataireAnnuel) : '',
    ebitdaLocataireAnnuel: lease.ebitdaLocataireAnnuel !== null && lease.ebitdaLocataireAnnuel !== undefined ? String(lease.ebitdaLocataireAnnuel) : '',
    tresorerieLocataire: lease.tresorerieLocataire !== null && lease.tresorerieLocataire !== undefined ? String(lease.tresorerieLocataire) : '',
    exerciceFinancierAsOf: toDateInputValue(lease.exerciceFinancierAsOf),
    indexation: lease.indexation,
    indexationCapPct: lease.indexationCapPct !== null && lease.indexationCapPct !== undefined ? String(lease.indexationCapPct) : '',
    indexationFloorPct: lease.indexationFloorPct !== null && lease.indexationFloorPct !== undefined ? String(lease.indexationFloorPct) : '',
  };
}

/** Onglet Locatif (spec V3 §7) — rent roll + statut de sécurisation issu du Lease Security Engine (calculé côté API, jamais stocké). */
export function LocatifTab({ projectId, leases, leaseAssessments }: { projectId: string; leases: FractionalLease[]; leaseAssessments?: LeaseAssessment[] }) {
  const [form, setForm] = useState<LeaseFormState>(EMPTY_FORM);
  const [editingLeaseId, setEditingLeaseId] = useState<string | null>(null);
  const create = useCreateLease(projectId);
  const update = useUpdateLease(projectId);
  const del = useDeleteLease(projectId);
  const { data: legalReviews } = useFractionalLegalReview(projectId);

  const assessmentByLeaseId = new Map((leaseAssessments ?? []).map((a) => [a.leaseId, a]));
  const legalReviewByLeaseId = new Map((legalReviews ?? []).map((r) => [r.leaseId, r]));

  const startEditing = (lease: FractionalLease) => {
    setEditingLeaseId(lease.id);
    setForm(leaseToFormState(lease));
  };

  const cancelEditing = () => {
    setEditingLeaseId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      tenantName: form.tenantName,
      loyerFacialAnnuel: Number(form.loyerFacialAnnuel),
      dateEffet: form.dateEffet,
      dateTerme: form.dateTerme,
      statutRenouvellement: form.statutRenouvellement,
      sirenLocataire: form.sirenLocataire || undefined,
      procedureCollective: form.procedureCollective,
      garantieMaisonMere: form.garantieMaisonMere,
      caLocataireAnnuel: form.caLocataireAnnuel ? Number(form.caLocataireAnnuel) : undefined,
      ebitdaLocataireAnnuel: form.ebitdaLocataireAnnuel ? Number(form.ebitdaLocataireAnnuel) : undefined,
      tresorerieLocataire: form.tresorerieLocataire ? Number(form.tresorerieLocataire) : undefined,
      exerciceFinancierAsOf: form.exerciceFinancierAsOf || undefined,
      indexation: form.indexation,
      indexationCapPct: form.indexationCapPct ? Number(form.indexationCapPct) : undefined,
      indexationFloorPct: form.indexationFloorPct ? Number(form.indexationFloorPct) : undefined,
    };
    if (editingLeaseId) {
      update.mutate({ leaseId: editingLeaseId, payload }, { onSuccess: () => cancelEditing() });
    } else {
      create.mutate(payload, { onSuccess: () => setForm(EMPTY_FORM) });
    }
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
                  <TableHead>Juridique</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {leases.map((lease) => {
                  const assessment = assessmentByLeaseId.get(lease.id);
                  const legalReview = legalReviewByLeaseId.get(lease.id);
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
                        {legalReview && legalReview.recommendations.length > 0 ? (
                          <span title={legalReview.recommendations.map((r) => r.message).join(' · ')}>
                            <Badge variant={LEGAL_SEVERITY_VARIANT[legalReview.worstSeverity]}>
                              {LEGAL_SEVERITY_LABELS[legalReview.worstSeverity]} ({legalReview.recommendations.length})
                            </Badge>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button variant="ghost" size="icon" onClick={() => startEditing(lease)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => del.mutate(lease.id)} disabled={del.isPending}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
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
          <CardTitle className="text-base">{editingLeaseId ? 'Modifier le bail' : 'Ajouter un bail'}</CardTitle>
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
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="sirenLocataire">SIREN locataire</Label>
                <Input id="sirenLocataire" value={form.sirenLocataire} onChange={(e) => setForm((p) => ({ ...p, sirenLocataire: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Indexation</Label>
                <Select value={form.indexation} onValueChange={(v) => setForm((p) => ({ ...p, indexation: v as FractionalIndexationType }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {INDEXATION_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="indexationFloorPct">Plancher indexation (%)</Label>
                <Input id="indexationFloorPct" type="number" step="0.1" value={form.indexationFloorPct} onChange={(e) => setForm((p) => ({ ...p, indexationFloorPct: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="indexationCapPct">Plafond indexation (%)</Label>
                <Input id="indexationCapPct" type="number" step="0.1" value={form.indexationCapPct} onChange={(e) => setForm((p) => ({ ...p, indexationCapPct: e.target.value }))} />
              </div>
            </div>
            <div className="flex flex-wrap gap-4 text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={form.procedureCollective} onChange={(e) => setForm((p) => ({ ...p, procedureCollective: e.target.checked }))} />
                Procédure collective en cours
              </label>
              <label className="flex items-center gap-2">
                <input type="checkbox" className="h-4 w-4 accent-primary" checked={form.garantieMaisonMere} onChange={(e) => setForm((p) => ({ ...p, garantieMaisonMere: e.target.checked }))} />
                Garantie maison mère
              </label>
            </div>
            <div className="flex flex-col gap-2">
              <Label className="text-xs uppercase text-muted-foreground">Bloc Financier — dernier exercice connu du locataire</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="caLocataireAnnuel">CA annuel</Label>
                  <Input id="caLocataireAnnuel" type="number" min={0} value={form.caLocataireAnnuel} onChange={(e) => setForm((p) => ({ ...p, caLocataireAnnuel: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ebitdaLocataireAnnuel">EBITDA annuel</Label>
                  <Input id="ebitdaLocataireAnnuel" type="number" value={form.ebitdaLocataireAnnuel} onChange={(e) => setForm((p) => ({ ...p, ebitdaLocataireAnnuel: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tresorerieLocataire">Trésorerie</Label>
                  <Input id="tresorerieLocataire" type="number" min={0} value={form.tresorerieLocataire} onChange={(e) => setForm((p) => ({ ...p, tresorerieLocataire: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="exerciceFinancierAsOf">Clôture de l'exercice</Label>
                  <Input id="exerciceFinancierAsOf" type="date" value={form.exerciceFinancierAsOf} onChange={(e) => setForm((p) => ({ ...p, exerciceFinancierAsOf: e.target.value }))} />
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={create.isPending || update.isPending}>
                {create.isPending || update.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : editingLeaseId ? (
                  <Pencil className="h-4 w-4" />
                ) : (
                  <Plus className="h-4 w-4" />
                )}
                {editingLeaseId ? 'Enregistrer les modifications' : 'Ajouter le bail'}
              </Button>
              {editingLeaseId && (
                <Button type="button" variant="ghost" onClick={cancelEditing}>
                  <X className="h-4 w-4" />
                  Annuler
                </Button>
              )}
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
