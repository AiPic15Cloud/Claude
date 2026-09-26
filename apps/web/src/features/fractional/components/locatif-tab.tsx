import { useState } from 'react';
import { Loader2, Plus, Trash2, Pencil, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { formatCurrency, formatDate } from '@/lib/format';
import { parseLocaleNumber } from '@/lib/locale-number';
import { useCreateLease, useUpdateLease, useDeleteLease, useFractionalLegalReview, useFractionalRentalReversion } from '../hooks/use-fractional';
import { ProvenanceBadge } from './provenance-badge';
import {
  FRACTIONAL_LEASE_RENEWAL_STATUS_LABELS,
  LEASE_SECURITY_STATUS_LABELS,
  REVERSION_STATUS_LABELS,
  type FractionalLease,
  type FractionalLeaseRenewalStatus,
  type FractionalIndexationType,
  type LeaseAssessment,
  type ReversionStatus,
} from '@/types';

const RENEWAL_STATUSES: FractionalLeaseRenewalStatus[] = ['SIGNE', 'EN_COURS', 'TACITE', 'DEPASSE', 'CONTESTE'];
const INDEXATION_TYPES: FractionalIndexationType[] = ['ILC', 'ILAT', 'IRL', 'ICC', 'AUTRE'];
const SECURITY_VARIANT = { SECURED: 'success', WATCH: 'warning', SECURE_BEFORE_ACQUISITION: 'warning', EXCLUDE_FROM_SECURED_YIELD: 'destructive' } as const;
const LEGAL_SEVERITY_VARIANT = { INFO: 'outline', WATCH: 'warning', ALERT: 'warning', CRITIQUE: 'destructive' } as const;
const LEGAL_SEVERITY_LABELS = { INFO: 'Info', WATCH: 'À surveiller', ALERT: 'Alerte', CRITIQUE: 'Critique' } as const;
const REVERSION_VARIANT: Record<ReversionStatus, 'success' | 'warning' | 'outline'> = {
  OVER_RENTED: 'warning',
  AT_MARKET: 'outline',
  UNDER_RENTED: 'success',
  ERV_MISSING: 'outline',
};

interface LeaseFormState {
  tenantName: string;
  loyerFacialAnnuel: string;
  ervAnnuel: string;
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
  ervAnnuel: '',
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
    ervAnnuel: lease.ervAnnuel !== null && lease.ervAnnuel !== undefined ? String(lease.ervAnnuel) : '',
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
  const { data: rentalReversion } = useFractionalRentalReversion(projectId);

  const assessmentByLeaseId = new Map((leaseAssessments ?? []).map((a) => [a.leaseId, a]));
  const legalReviewByLeaseId = new Map((legalReviews ?? []).map((r) => [r.leaseId, r]));
  const reversionByLeaseId = new Map((rentalReversion?.leases ?? []).map((r) => [r.leaseId, r]));

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
      loyerFacialAnnuel: parseLocaleNumber(form.loyerFacialAnnuel),
      ervAnnuel: form.ervAnnuel ? parseLocaleNumber(form.ervAnnuel) : undefined,
      dateEffet: form.dateEffet,
      dateTerme: form.dateTerme,
      statutRenouvellement: form.statutRenouvellement,
      sirenLocataire: form.sirenLocataire || undefined,
      procedureCollective: form.procedureCollective,
      garantieMaisonMere: form.garantieMaisonMere,
      caLocataireAnnuel: form.caLocataireAnnuel ? parseLocaleNumber(form.caLocataireAnnuel) : undefined,
      ebitdaLocataireAnnuel: form.ebitdaLocataireAnnuel ? parseLocaleNumber(form.ebitdaLocataireAnnuel) : undefined,
      tresorerieLocataire: form.tresorerieLocataire ? parseLocaleNumber(form.tresorerieLocataire) : undefined,
      exerciceFinancierAsOf: form.exerciceFinancierAsOf || undefined,
      indexation: form.indexation,
      indexationCapPct: form.indexationCapPct ? parseLocaleNumber(form.indexationCapPct) : undefined,
      indexationFloorPct: form.indexationFloorPct ? parseLocaleNumber(form.indexationFloorPct) : undefined,
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
                  <TableHead>Reversion (ERV)</TableHead>
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
                  const reversion = reversionByLeaseId.get(lease.id);
                  return (
                    <TableRow key={lease.id}>
                      <TableCell>{lease.tenantName}</TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {formatCurrency(lease.loyerFacialAnnuel)}
                          <ProvenanceBadge entityType="LEASE" entityId={lease.id} fieldKey="loyerFacialAnnuel" label="Loyer facial annuel" />
                        </span>
                      </TableCell>
                      <TableCell>
                        {reversion ? (
                          <span title={reversion.ervAnnuel !== null ? `ERV : ${formatCurrency(reversion.ervAnnuel)}` : 'ERV non renseignée'}>
                            <Badge variant={REVERSION_VARIANT[reversion.status]}>
                              {reversion.reversionPct !== null ? `${reversion.reversionPct >= 0 ? '+' : ''}${reversion.reversionPct.toFixed(1)}%` : REVERSION_STATUS_LABELS.ERV_MISSING}
                            </Badge>
                          </span>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        <span className="inline-flex items-center gap-1.5">
                          {formatDate(lease.dateTerme)}
                          <ProvenanceBadge entityType="LEASE" entityId={lease.id} fieldKey="dateTerme" label="Date de terme" />
                        </span>
                      </TableCell>
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
                <DecimalInput
                  id="loyerFacialAnnuel"
                  required
                  value={form.loyerFacialAnnuel}
                  onChange={(e) => setForm((p) => ({ ...p, loyerFacialAnnuel: e.target.value }))}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="ervAnnuel">ERV annuelle (valeur locative de marché)</Label>
                <DecimalInput
                  id="ervAnnuel"
                  placeholder="Optionnel — alimente le Rental Reversion Engine"
                  value={form.ervAnnuel}
                  onChange={(e) => setForm((p) => ({ ...p, ervAnnuel: e.target.value }))}
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
                <DecimalInput id="indexationFloorPct" placeholder="ex. 0" value={form.indexationFloorPct} onChange={(e) => setForm((p) => ({ ...p, indexationFloorPct: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="indexationCapPct">Plafond indexation (%)</Label>
                <DecimalInput id="indexationCapPct" placeholder="ex. 3" value={form.indexationCapPct} onChange={(e) => setForm((p) => ({ ...p, indexationCapPct: e.target.value }))} />
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
                  <DecimalInput id="caLocataireAnnuel" value={form.caLocataireAnnuel} onChange={(e) => setForm((p) => ({ ...p, caLocataireAnnuel: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="ebitdaLocataireAnnuel">EBITDA annuel</Label>
                  <DecimalInput id="ebitdaLocataireAnnuel" value={form.ebitdaLocataireAnnuel} onChange={(e) => setForm((p) => ({ ...p, ebitdaLocataireAnnuel: e.target.value }))} />
                </div>
                <div className="flex flex-col gap-1.5">
                  <Label htmlFor="tresorerieLocataire">Trésorerie</Label>
                  <DecimalInput id="tresorerieLocataire" value={form.tresorerieLocataire} onChange={(e) => setForm((p) => ({ ...p, tresorerieLocataire: e.target.value }))} />
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
