import { useState } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useFractionalLegalTaxDd, useUpsertLegalTaxItemStatus } from '../hooks/use-fractional';
import {
  LEGAL_TAX_ITEM_STATUS_LABELS,
  LEGAL_TAX_PROFESSIONAL_LABELS,
  type LegalTaxBlockKey,
  type LegalTaxItemResult,
  type LegalTaxItemStatusValue,
} from '@/types';

const STATUS_VALUES: LegalTaxItemStatusValue[] = ['NON_CONTROLE', 'CONFORME', 'RESERVE'];

function statusBadgeVariant(status: LegalTaxItemStatusValue): 'success' | 'destructive' | 'secondary' {
  if (status === 'CONFORME') return 'success';
  if (status === 'RESERVE') return 'destructive';
  return 'secondary';
}

/**
 * Legal, Planning & Tax DD Engine (spec V3.1 §13) — couvre uniquement les
 * blocs sans registre dédié ailleurs (Urbanisme, Fiscalité véhicule,
 * Contentieux). Titre/Environnement/Baux/Assurance restent uniquement dans
 * Data Room, Technical DD et la revue juridique des baux (Single Source of
 * Truth) — voir les onglets Data Room et Technique pour ces blocs.
 */
export function LegalTaxDdTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFractionalLegalTaxDd(projectId);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;
  const { blocks, validationNeeded } = data;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardContent className="pt-6">
          <p className="text-xs text-muted-foreground">
            Ces trois blocs (Urbanisme, Fiscalité véhicule, Contentieux) n'ont pas de registre ailleurs dans Atlas. Titre/Environnement sont dans l'onglet{' '}
            <span className="font-medium text-foreground">Data Room</span>, Assurance/Environnement (technique) dans l'onglet{' '}
            <span className="font-medium text-foreground">Technique</span>, Baux dans l'onglet <span className="font-medium text-foreground">Locatif</span>. Atlas signale ce qui
            nécessite une validation professionnelle — il ne remplace jamais avocat, notaire, fiscaliste ou expert.
          </p>
        </CardContent>
      </Card>

      {validationNeeded.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Validation professionnelle requise</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            {validationNeeded.map((v) => (
              <div key={`${v.block}:${v.itemKey}`} className="flex flex-wrap items-start gap-2 border-b border-border pb-2 last:border-b-0">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                <div className="flex-1">
                  <span className="text-sm font-medium">
                    {v.blockLabel} — {v.label}
                  </span>
                  {v.notes && <p className="text-xs text-muted-foreground">{v.notes}</p>}
                </div>
                <Badge variant="outline">{LEGAL_TAX_PROFESSIONAL_LABELS[v.professional]}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {blocks.map((block) => (
        <Card key={block.block}>
          <CardHeader className="pb-3">
            <div className="flex items-center gap-3">
              <CardTitle className="text-base">{block.label}</CardTitle>
              <span className="text-sm tabular-nums text-muted-foreground">
                {block.conformeCount}/{block.total} conforme{block.conformeCount > 1 ? 's' : ''}
              </span>
              {block.reserveCount > 0 && (
                <Badge variant="destructive">
                  {block.reserveCount} réserve{block.reserveCount > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-0">
            {block.items.map((item) => (
              <LegalTaxItemRow key={item.itemKey} projectId={projectId} block={block.block} item={item} />
            ))}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function LegalTaxItemRow({ projectId, block, item }: { projectId: string; block: LegalTaxBlockKey; item: LegalTaxItemResult }) {
  const upsert = useUpsertLegalTaxItemStatus(projectId);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  const handleStatusChange = (status: LegalTaxItemStatusValue) => {
    upsert.mutate({ block, itemKey: item.itemKey, payload: { status, notes: notes || undefined } });
  };

  const handleSaveNotes = () => {
    upsert.mutate({ block, itemKey: item.itemKey, payload: { status: item.status, notes: notes || undefined } }, { onSuccess: () => setEditingNotes(false) });
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm">{item.label}</span>
        <span className="text-xs text-muted-foreground">{LEGAL_TAX_PROFESSIONAL_LABELS[item.professional]}</span>
        <Badge variant={statusBadgeVariant(item.status)}>{LEGAL_TAX_ITEM_STATUS_LABELS[item.status]}</Badge>
        <Select value={item.status} onValueChange={(v) => handleStatusChange(v as LegalTaxItemStatusValue)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {LEGAL_TAX_ITEM_STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {upsert.isPending && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        <Button type="button" variant="ghost" size="sm" onClick={() => setEditingNotes((p) => !p)}>
          {item.notes ? 'Note' : '+ Note'}
        </Button>
      </div>
      {(editingNotes || item.notes) && (
        <div className="flex items-start gap-2">
          {editingNotes ? (
            <>
              <Textarea className="min-h-16 flex-1" placeholder="Contexte — ex. nature de la réserve" value={notes} onChange={(e) => setNotes(e.target.value)} />
              <Button type="button" size="sm" onClick={handleSaveNotes} disabled={upsert.isPending}>
                Enregistrer
              </Button>
            </>
          ) : (
            <p className="flex-1 text-sm text-muted-foreground">{item.notes}</p>
          )}
        </div>
      )}
    </div>
  );
}
