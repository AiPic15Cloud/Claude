import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineEntries, usePipelineSummary } from './hooks/use-pipeline';
import { useFeesProjection } from '@/features/cockpit/hooks/use-fees';
import { CreatePipelineEntryDialog } from './components/create-pipeline-entry-dialog';
import { EditPipelineEntryDialog } from './components/edit-pipeline-entry-dialog';
import { ConvertPipelineEntryDialog } from './components/convert-pipeline-entry-dialog';
import { NewslettersCard } from './components/newsletters-card';
import { COMMITTEE_STATUS_LABELS, type CommitteeStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';

const FILTERS: { label: string; value: CommitteeStatus | undefined }[] = [
  { label: 'Tous', value: undefined },
  { label: 'Pas de comité', value: 'PAS_DE_COMITE' },
  { label: 'Validé', value: 'VALIDE' },
  { label: 'Conditions suspensives', value: 'CONDITIONS_SUSPENSIVES' },
  { label: 'Refusé', value: 'REFUSE' },
];

const COMMITTEE_VARIANT: Record<CommitteeStatus, 'secondary' | 'success' | 'warning' | 'destructive'> = {
  PAS_DE_COMITE: 'secondary',
  VALIDE: 'success',
  CONDITIONS_SUSPENSIVES: 'warning',
  REFUSE: 'destructive',
};

function KpiTile({ label, value, hint, hero }: { label: string; value: string; hint?: string; hero?: boolean }) {
  return (
    <Card className={cn(hero && 'border-primary/30 bg-gradient-to-br from-primary/10 via-card to-card lg:col-span-2')}>
      <CardContent className={cn('p-4', hero && 'p-5')}>
        <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className={cn('mt-1 font-mono font-semibold tabular-nums', hero ? 'text-4xl' : 'text-2xl')}>{value}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

export function PipelinePage() {
  const [committee, setCommittee] = useState<CommitteeStatus | undefined>(undefined);
  const { data: summary, isLoading: summaryLoading } = usePipelineSummary();
  const { data: projection, isLoading: projectionLoading } = useFeesProjection();
  const { data: entriesData, isLoading: entriesLoading } = usePipelineEntries(committee);
  const entries = entriesData?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</p>
          <h1 className="text-xl font-semibold tracking-tight">Dossiers reçus &amp; décisions comité</h1>
          <p className="text-sm text-muted-foreground">
            {summary ? `${summary.received} dossiers analysés · pipeline cumulé de ${formatCurrency(summary.totalAmount)}.` : '…'}
          </p>
        </div>
        <CreatePipelineEntryDialog />
      </div>

      {summaryLoading || !summary ? (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-7">
          <KpiTile label="Volume analysé" value={formatCurrency(summary.totalAmount)} hero />
          <KpiTile label="Dossiers reçus" value={String(summary.received)} hint="cumulé" />
          <KpiTile label="Validés comité" value={String(summary.validatedCount)} hint={`${summary.validatedRate}% conversion`} />
          <KpiTile label="À approfondir" value={String(summary.toReviewCount)} />
          <KpiTile label="Refusés" value={String(summary.rejectedCount)} />
          <KpiTile
            label="Projection CA (fees)"
            value={projectionLoading || !projection ? '…' : formatCurrency(projection.projectedFees)}
            hint={
              projection
                ? `taux moyen ${projection.avgFeesRate}% · conversion ${projection.conversionRate}%${projection.conversionRateIsDefault ? ' (estimation)' : ''}`
                : undefined
            }
          />
        </div>
      )}

      {summary && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Sources d'apport</p>
              {summary.bySource.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée</p>}
              {summary.bySource.map((s) => {
                const max = summary.bySource[0]?.count || 1;
                return (
                  <div key={s.source} className="flex items-center gap-3">
                    <span className="w-24 shrink-0 truncate text-sm">{s.source}</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-secondary">
                      <div className="h-full rounded-full bg-chart-accent" style={{ width: `${(s.count / max) * 100}%` }} />
                    </div>
                    <span className="w-8 shrink-0 text-right text-sm tabular-nums text-muted-foreground">{s.count}</span>
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardContent className="flex flex-col gap-2 p-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Typologies</p>
              {summary.byTypology.length === 0 && <p className="text-xs text-muted-foreground">Aucune donnée</p>}
              {summary.byTypology.map((t) => (
                <div key={t.typology} className="flex items-center justify-between text-sm">
                  <span className="truncate">{t.typology}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">
                    {t.count} · {formatCurrency(t.amount)}
                  </span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {FILTERS.map((f) => (
          <Button
            key={f.label}
            size="sm"
            variant={committee === f.value ? 'default' : 'outline'}
            onClick={() => setCommittee(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-secondary/40 text-xs text-muted-foreground">
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Date</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Opérateur</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Typologie</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Source</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Montant</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Marge</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Fees</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Comité</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Décision</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-left font-medium">Opération</th>
              <th className="whitespace-nowrap px-4 py-2.5 text-right font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {entriesLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <tr key={i} className="border-b border-border">
                  <td colSpan={11} className="px-4 py-2">
                    <Skeleton className="h-5 w-full" />
                  </td>
                </tr>
              ))}
            {!entriesLoading && entries.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-xs text-muted-foreground">
                  Aucun dossier
                </td>
              </tr>
            )}
            {!entriesLoading &&
              entries.map((e) => (
                <tr key={e.id} className="border-b border-border/60 hover:bg-accent">
                  <td className="whitespace-nowrap px-4 py-2 text-muted-foreground">{formatDate(e.date)}</td>
                  <td className="px-4 py-2 font-medium">{e.operator}</td>
                  <td className="px-4 py-2 text-muted-foreground">{e.typology || '—'}</td>
                  <td className="px-4 py-2 text-muted-foreground">{e.source || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{formatCurrency(e.amount)}</td>
                  <td className={cn('whitespace-nowrap px-4 py-2 text-right tabular-nums', Number(e.margin) < 0 && 'text-destructive')}>
                    {e.margin ? `${e.margin}%` : '—'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right tabular-nums">{e.feesRate ? `${e.feesRate}%` : '—'}</td>
                  <td className="px-4 py-2">
                    <Badge variant={COMMITTEE_VARIANT[e.committee]}>{COMMITTEE_STATUS_LABELS[e.committee]}</Badge>
                  </td>
                  <td className="px-4 py-2 text-muted-foreground">{e.decision || '—'}</td>
                  <td className="whitespace-nowrap px-4 py-2">
                    {e.convertedDeal ? (
                      <Link to={`/deals/${e.convertedDeal.id}`} className="text-primary hover:underline">
                        {e.convertedDeal.reference}
                      </Link>
                    ) : e.committee === 'VALIDE' ? (
                      <ConvertPipelineEntryDialog entry={e} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-right">
                    <EditPipelineEntryDialog entry={e} />
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <NewslettersCard />
    </div>
  );
}
