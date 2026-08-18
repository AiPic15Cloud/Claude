import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { usePipelineEntries, usePipelineSummary } from './hooks/use-pipeline';
import { useFeesProjection } from '@/features/cockpit/hooks/use-fees';
import { HeroMetric } from '@/features/cockpit/components/hero-metric';
import { CreatePipelineEntryDialog } from './components/create-pipeline-entry-dialog';
import { EditPipelineEntryDialog } from './components/edit-pipeline-entry-dialog';
import { ConvertPipelineEntryDialog } from './components/convert-pipeline-entry-dialog';
import { NewslettersCard } from './components/newsletters-card';
import { COMMITTEE_STATUS_LABELS, type CommitteeStatus } from '@/types';
import { formatCurrency, formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { PageHeader } from '@/components/ui/page-header';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';

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

export function PipelinePage() {
  const [committee, setCommittee] = useState<CommitteeStatus | undefined>(undefined);
  const { data: summary, isLoading: summaryLoading } = usePipelineSummary();
  const { data: projection, isLoading: projectionLoading } = useFeesProjection();
  const { data: entriesData, isLoading: entriesLoading } = usePipelineEntries(committee);
  const entries = entriesData?.items ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        eyebrow="Pipeline"
        title="Dossiers reçus & décisions comité"
        description="Sourcing, décisions de comité et sources d'apport des dossiers reçus."
        actions={<CreatePipelineEntryDialog />}
      />

      {summaryLoading || !summary ? (
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:gap-16">
          <Skeleton className="h-28 w-64" />
          <div className="flex flex-col gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-6" />
            ))}
          </div>
        </div>
      ) : (
        <HeroMetric
          label="Volume analysé"
          value={formatCurrency(summary.totalAmount)}
          context={`${summary.received} dossiers reçus`}
          stats={[
            { label: 'Validés comité', value: `${summary.validatedCount} (${summary.validatedRate}%)` },
            { label: 'À approfondir', value: String(summary.toReviewCount) },
            { label: 'Refusés', value: String(summary.rejectedCount) },
            {
              label: 'Projection CA (fees)',
              value:
                projectionLoading || !projection
                  ? '…'
                  : `${formatCurrency(projection.projectedFees)}${projection.conversionRateIsDefault ? ' (estimation)' : ''}`,
            },
          ]}
        />
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

      <div className="rounded-lg border border-border">
        <Table>
          <TableHeader>
            <TableRow className="bg-secondary/40 hover:bg-secondary/40">
              <TableHead>Date</TableHead>
              <TableHead>Opérateur</TableHead>
              <TableHead>Typologie</TableHead>
              <TableHead>Source</TableHead>
              <TableHead className="text-right">Montant</TableHead>
              <TableHead className="text-right">Marge</TableHead>
              <TableHead className="text-right">Fees</TableHead>
              <TableHead>Comité</TableHead>
              <TableHead>Décision</TableHead>
              <TableHead>Opération</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entriesLoading &&
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={11}>
                    <Skeleton className="h-5 w-full" />
                  </TableCell>
                </TableRow>
              ))}
            {!entriesLoading && entries.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="py-8 text-center text-xs text-muted-foreground">
                  Aucun dossier
                </TableCell>
              </TableRow>
            )}
            {!entriesLoading &&
              entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="whitespace-nowrap font-mono tabular-nums text-muted-foreground">{formatDate(e.date)}</TableCell>
                  <TableCell className="font-medium">{e.operator}</TableCell>
                  <TableCell className="text-muted-foreground">{e.typology || '—'}</TableCell>
                  <TableCell className="text-muted-foreground">{e.source || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{formatCurrency(e.amount)}</TableCell>
                  <TableCell className={cn('whitespace-nowrap text-right font-mono tabular-nums', Number(e.margin) < 0 && 'text-destructive')}>
                    {e.margin ? `${e.margin}%` : '—'}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right font-mono tabular-nums">{e.feesRate ? `${e.feesRate}%` : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={COMMITTEE_VARIANT[e.committee]}>{COMMITTEE_STATUS_LABELS[e.committee]}</Badge>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{e.decision || '—'}</TableCell>
                  <TableCell className="whitespace-nowrap">
                    {e.convertedDeal ? (
                      <Link to={`/deals/${e.convertedDeal.id}`} className="text-primary hover:underline">
                        {e.convertedDeal.reference}
                      </Link>
                    ) : e.committee === 'VALIDE' ? (
                      <ConvertPipelineEntryDialog entry={e} />
                    ) : (
                      <span className="text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell className="whitespace-nowrap text-right">
                    <EditPipelineEntryDialog entry={e} />
                  </TableCell>
                </TableRow>
              ))}
          </TableBody>
        </Table>
      </div>

      <NewslettersCard />
    </div>
  );
}
