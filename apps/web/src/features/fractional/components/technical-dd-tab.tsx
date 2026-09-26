import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { useFractionalTechnicalDd, useUpsertTechnicalAssessment } from '../hooks/use-fractional';
import { TECHNICAL_TIER_LABELS, type TechnicalSubBlock, type TechnicalSubBlockResult, type TechnicalTier } from '@/types';

const TIER_VALUES: TechnicalTier[] = ['BON', 'MOYEN', 'MAUVAIS', 'CRITIQUE'];
const NONE_VALUE = '__none__';

function tierBadgeVariant(tier: TechnicalTier | null): 'success' | 'warning' | 'destructive' | 'secondary' {
  if (tier === 'BON') return 'success';
  if (tier === 'MOYEN') return 'warning';
  if (tier === 'MAUVAIS' || tier === 'CRITIQUE') return 'destructive';
  return 'secondary';
}

/**
 * Asset & Technical Due Diligence Engine (spec V3.1 §6) — 7 sous-blocs
 * fermés, chacun noté par un tier explicite (jamais un score composite
 * opaque fusionnant bâtiment/conformité/état/...). Un sous-bloc sans
 * évaluation reste "non évalué" (Unknown ≠ Zero) — jamais assimilé à BON.
 * Le plan CAPEX par horizon est calculé côté serveur à partir des mêmes
 * FractionalCapexItem qui alimentent déjà NOI/IRR (Single Source of Truth).
 */
export function TechnicalDdTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFractionalTechnicalDd(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;
  const { rating, capexPlan } = data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Technical Risk Rating</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Pire tier atteint :</span>
              <Badge variant={tierBadgeVariant(rating.worstTier)}>{rating.worstTier ? TECHNICAL_TIER_LABELS[rating.worstTier] : 'Non évalué'}</Badge>
            </div>
            <span className="text-sm text-muted-foreground">
              {rating.criticalCount} critique{rating.criticalCount !== 1 ? 's' : ''} · {rating.conditionPrealableCount} condition{rating.conditionPrealableCount !== 1 ? 's' : ''} préalable
              {rating.conditionPrealableCount !== 1 ? 's' : ''}
            </span>
          </div>
          {rating.unassessedCount > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {rating.unassessedCount} sous-bloc{rating.unassessedCount > 1 ? 's' : ''} non évalué{rating.unassessedCount > 1 ? 's' : ''}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Sous-blocs (spec V3.1 §6)</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-0">
          {rating.subBlocks.map((subBlock) => (
            <TechnicalSubBlockRow key={subBlock.subBlock} projectId={projectId} subBlock={subBlock} />
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Plan CAPEX par horizon</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="mb-3 text-xs text-muted-foreground">
            Calculé à partir des lignes CAPEX déjà saisies dans l'onglet Acquisition — mêmes montants que ceux pris en compte dans le cash-flow/DCF, jamais
            un second plan susceptible de diverger.
          </p>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Horizon</TableHead>
                  <TableHead>Propriétaire</TableHead>
                  <TableHead>Locataire</TableHead>
                  <TableHead>Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {capexPlan.map((bucket) => (
                  <TableRow key={bucket.horizon}>
                    <TableCell>{bucket.label}</TableCell>
                    <TableCell>{formatCurrency(bucket.proprietaireTotal)}</TableCell>
                    <TableCell>{formatCurrency(bucket.locataireTotal)}</TableCell>
                    <TableCell className="font-medium">{formatCurrency(bucket.total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TechnicalSubBlockRow({ projectId, subBlock }: { projectId: string; subBlock: TechnicalSubBlockResult }) {
  const upsert = useUpsertTechnicalAssessment(projectId);
  const [notes, setNotes] = useState(subBlock.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  const hasTier = subBlock.tier !== null;

  // Ces deux handlers envoient la valeur de `notes` la plus récente connue du
  // serveur (le prop `subBlock`, rafraîchi à chaque refetch), pas le state local
  // `notes` — celui-ci n'est resynchronisé que via handleSaveNotes et resterait
  // sinon périmé si une édition concurrente a modifié la note entre le montage
  // de la ligne et ce changement de tier/condition, écrasant l'édition concurrente.
  const handleTierChange = (tier: TechnicalTier) => {
    upsert.mutate({ subBlock: subBlock.subBlock as TechnicalSubBlock, payload: { tier, conditionPrealable: subBlock.conditionPrealable, notes: subBlock.notes ?? undefined } });
  };

  const handleConditionPrealableChange = (conditionPrealable: boolean) => {
    if (!subBlock.tier) return;
    upsert.mutate({ subBlock: subBlock.subBlock as TechnicalSubBlock, payload: { tier: subBlock.tier, conditionPrealable, notes: subBlock.notes ?? undefined } });
  };

  const handleSaveNotes = () => {
    if (!subBlock.tier) return;
    upsert.mutate(
      { subBlock: subBlock.subBlock as TechnicalSubBlock, payload: { tier: subBlock.tier, conditionPrealable: subBlock.conditionPrealable, notes: notes || undefined } },
      { onSuccess: () => setEditingNotes(false) },
    );
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-3 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex-1">
          <p className="text-sm font-medium">{subBlock.label}</p>
          <p className="text-xs text-muted-foreground">{subBlock.criteria}</p>
        </div>
        <Badge variant={tierBadgeVariant(subBlock.tier)}>{subBlock.tier ? TECHNICAL_TIER_LABELS[subBlock.tier] : 'Non évalué'}</Badge>
        <Select value={subBlock.tier ?? NONE_VALUE} onValueChange={(v) => v !== NONE_VALUE && handleTierChange(v as TechnicalTier)}>
          <SelectTrigger className="w-32">
            <SelectValue placeholder="Non évalué" />
          </SelectTrigger>
          <SelectContent>
            {TIER_VALUES.map((t) => (
              <SelectItem key={t} value={t}>
                {TECHNICAL_TIER_LABELS[t]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="flex items-center gap-2">
          <Switch checked={subBlock.conditionPrealable} onCheckedChange={handleConditionPrealableChange} disabled={!hasTier} id={`cp-${subBlock.subBlock}`} />
          <label htmlFor={`cp-${subBlock.subBlock}`} className="text-sm text-muted-foreground">
            Condition préalable
          </label>
        </div>
        {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button type="button" variant="ghost" size="sm" disabled={!hasTier} onClick={() => setEditingNotes((p) => !p)}>
          {subBlock.notes ? 'Note' : '+ Note'}
        </Button>
      </div>
      {(editingNotes || subBlock.notes) && (
        <div className="flex items-start gap-2">
          {editingNotes ? (
            <>
              <Textarea className="min-h-16 flex-1" placeholder="Contexte — ex. quoi/pourquoi critique" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="button" size="sm" onClick={handleSaveNotes} disabled={upsert.isPending}>
                Enregistrer
              </Button>
            </>
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">{subBlock.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
