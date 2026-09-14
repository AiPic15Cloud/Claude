import { useState } from 'react';
import { AlertTriangle, ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useFractionalDataRoomCompleteness, useUpsertDataRoomItemStatus } from '../hooks/use-fractional';
import { DATA_ROOM_ITEM_STATUS_LABELS, type DataRoomBlockKey, type DataRoomItemResult, type DataRoomItemStatusValue } from '@/types';

const STATUS_VALUES: DataRoomItemStatusValue[] = ['OBTAINED', 'MISSING', 'NOT_APPLICABLE', 'INCONSISTENT'];

function statusBadgeVariant(status: DataRoomItemStatusValue): 'success' | 'destructive' | 'warning' | 'secondary' {
  if (status === 'OBTAINED') return 'success';
  if (status === 'INCONSISTENT') return 'destructive';
  if (status === 'NOT_APPLICABLE') return 'secondary';
  return 'warning';
}

function completenessTone(pct: number): string {
  if (pct >= 90) return 'bg-success';
  if (pct >= 60) return 'bg-warning';
  return 'bg-destructive';
}

/**
 * Data Room Completeness Engine (spec V3.1 §4) — 9 blocs DD fermés
 * (data-room-completeness.util.ts), complétude calculée côté serveur en
 * excluant NOT_APPLICABLE du dénominateur. Chaque pièce sans statut
 * enregistré s'affiche MISSING par défaut (Unknown ≠ Zero) : rien n'est
 * pré-coché à l'ouverture d'un dossier.
 */
export function DataRoomTab({ projectId }: { projectId: string }) {
  const { data, isLoading } = useFractionalDataRoomCompleteness(projectId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  if (!data) return null;

  const flaggedCount = data.missingItems.length + data.inconsistentItems.length;

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Complétude de la data room</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl font-semibold tabular-nums">{data.overallCompletenessPct}%</span>
            <Progress value={data.overallCompletenessPct} className="flex-1" indicatorClassName={completenessTone(data.overallCompletenessPct)} />
          </div>
          {flaggedCount > 0 && (
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 text-warning" />
              {data.missingItems.length} pièce{data.missingItems.length > 1 ? 's' : ''} manquante{data.missingItems.length > 1 ? 's' : ''}
              {data.inconsistentItems.length > 0 && `, ${data.inconsistentItems.length} incohérence${data.inconsistentItems.length > 1 ? 's' : ''}`}
            </p>
          )}
        </CardContent>
      </Card>

      {data.blocks.map((block) => (
        <Card key={block.block}>
          <CardHeader className="pb-3">
            <button
              type="button"
              className="flex w-full items-center justify-between gap-3 text-left"
              onClick={() => setExpanded((p) => ({ ...p, [block.block]: !p[block.block] }))}
            >
              <div className="flex flex-1 items-center gap-3">
                <CardTitle className="text-base">{block.label}</CardTitle>
                <span className="text-sm tabular-nums text-muted-foreground">
                  {block.obtainedCount}/{block.total - block.notApplicableCount} · {block.completenessPct}%
                </span>
                {block.inconsistentCount > 0 && (
                  <Badge variant="destructive">
                    {block.inconsistentCount} incohérence{block.inconsistentCount > 1 ? 's' : ''}
                  </Badge>
                )}
              </div>
              <Progress value={block.completenessPct} className="w-32" indicatorClassName={completenessTone(block.completenessPct)} />
              {expanded[block.block] ? <ChevronUp className="h-4 w-4 shrink-0" /> : <ChevronDown className="h-4 w-4 shrink-0" />}
            </button>
          </CardHeader>
          {expanded[block.block] && (
            <CardContent className="flex flex-col gap-2 pt-0">
              {block.items.map((item) => (
                <DataRoomItemRow key={item.itemKey} projectId={projectId} block={block.block} item={item} />
              ))}
            </CardContent>
          )}
        </Card>
      ))}
    </div>
  );
}

function DataRoomItemRow({ projectId, block, item }: { projectId: string; block: DataRoomBlockKey; item: DataRoomItemResult }) {
  const upsert = useUpsertDataRoomItemStatus(projectId);
  const [notes, setNotes] = useState(item.notes ?? '');
  const [editingNotes, setEditingNotes] = useState(false);

  const handleStatusChange = (status: DataRoomItemStatusValue) => {
    upsert.mutate({ block, itemKey: item.itemKey, payload: { status, notes: notes || undefined } });
  };

  const handleSaveNotes = () => {
    upsert.mutate({ block, itemKey: item.itemKey, payload: { status: item.status, notes: notes || undefined } }, { onSuccess: () => setEditingNotes(false) });
  };

  return (
    <div className="flex flex-col gap-1.5 border-b border-border py-2 last:border-b-0">
      <div className="flex flex-wrap items-center gap-3">
        <span className="flex-1 text-sm">{item.label}</span>
        <Badge variant={statusBadgeVariant(item.status)}>{DATA_ROOM_ITEM_STATUS_LABELS[item.status]}</Badge>
        <Select value={item.status} onValueChange={(v) => handleStatusChange(v as DataRoomItemStatusValue)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {STATUS_VALUES.map((s) => (
              <SelectItem key={s} value={s}>
                {DATA_ROOM_ITEM_STATUS_LABELS[s]}
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
        <div className="flex items-start gap-2 pl-0">
          {editingNotes ? (
            <>
              <Textarea
                className="min-h-16 flex-1"
                placeholder="Contexte — ex. quoi/pourquoi incohérent"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
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
