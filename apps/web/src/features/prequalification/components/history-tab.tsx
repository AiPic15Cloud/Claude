import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { usePrequalVersions, usePrequalVersionCompare } from '../hooks/use-prequalification';
import { PREQUALIFICATION_ORIENTATION_LABELS, FINDING_SEVERITY_LABELS, type FindingSeverityKey } from '@/types';

const FINANCIAL_FIELD_LABELS: Record<string, string> = {
  amountRequested: 'Montant recherché',
  declaredEquity: 'Apport annoncé',
  provenEquity: 'Apport prouvé',
  coutDeRevient: 'Coût de revient',
  chiffreAffaires: "Chiffre d'affaires",
  margeRecalculee: 'Marge',
  margeRecalculeePct: 'Marge %',
  besoinMaxFinancement: 'Besoin max. financement',
  ltaPct: 'LTA',
  ltcPct: 'LTC',
  ltvPct: 'LTV',
};

const SEVERITY_ORDER: FindingSeverityKey[] = ['BLOCKING', 'MATERIAL', 'WATCH', 'POSITIVE', 'INFO'];

/** Historique et comparaison de versions (spec §15.16, §17) — chaque version est un instantané figé posé à la validation, jamais recalculé rétroactivement. */
export function HistoryTab({ caseId }: { caseId: string }) {
  const { data: versions, isLoading } = usePrequalVersions(caseId);
  const [versionA, setVersionA] = useState<number | null>(null);
  const [versionB, setVersionB] = useState<number | null>(null);
  const { data: diff } = usePrequalVersionCompare(caseId, versionA, versionB);

  if (isLoading || !versions) {
    return (
      <div className="flex flex-col gap-4">
        <Skeleton className="h-24" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Versions</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {versions.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucune version validée pour l'instant.</p>}
          {versions.map((v) => (
            <div key={v.id} className="flex flex-col gap-1 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">Version {v.versionNumber}</span>
                <Badge variant="outline">{PREQUALIFICATION_ORIENTATION_LABELS[v.orientation]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {formatDate(v.validatedAt)} — {v.validatedBy ? `${v.validatedBy.firstName} ${v.validatedBy.lastName}` : '—'}
                </span>
              </div>
              <p className="text-sm text-muted-foreground">{v.decisionComment}</p>
            </div>
          ))}
        </CardContent>
      </Card>

      {versions.length >= 2 && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Comparer deux versions</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-wrap items-end gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Version A</Label>
                <Select value={versionA?.toString()} onValueChange={(v) => setVersionA(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                        Version {v.versionNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Version B</Label>
                <Select value={versionB?.toString()} onValueChange={(v) => setVersionB(Number(v))}>
                  <SelectTrigger className="w-32">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {versions.map((v) => (
                      <SelectItem key={v.versionNumber} value={v.versionNumber.toString()}>
                        Version {v.versionNumber}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {diff && (
              <div className="flex flex-col gap-4">
                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Orientation :</span>
                  <Badge variant="outline">{diff.orientationA ?? '—'}</Badge>
                  <span>→</span>
                  <Badge variant={diff.orientationChanged ? 'default' : 'outline'}>{diff.orientationB ?? '—'}</Badge>
                </div>

                {diff.financialChanges.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <span className="text-sm font-medium">Bilan financier — écarts</span>
                    {diff.financialChanges.map((delta) => (
                      <div key={delta.field} className="flex items-center gap-2 text-sm">
                        <span className="w-52 text-muted-foreground">{FINANCIAL_FIELD_LABELS[delta.field] ?? delta.field}</span>
                        <span>{delta.before ?? '—'}</span>
                        <span>→</span>
                        <span className="font-medium">{delta.after ?? '—'}</span>
                      </div>
                    ))}
                  </div>
                )}
                {diff.financialChanges.length === 0 && <p className="text-sm text-muted-foreground">Aucun écart sur le bilan financier entre ces deux versions.</p>}

                <div className="flex flex-col gap-1.5">
                  <span className="text-sm font-medium">Findings par sévérité</span>
                  <div className="flex flex-wrap gap-3">
                    {SEVERITY_ORDER.map((sev) => (
                      <span key={sev} className="text-sm">
                        {FINDING_SEVERITY_LABELS[sev]} : {diff.findingsCountA[sev]} → {diff.findingsCountB[sev]}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
                  <span>Porteurs : {diff.peopleCountA} → {diff.peopleCountB}</span>
                  <span>Sociétés : {diff.companiesCountA} → {diff.companiesCountB}</span>
                  <span>Lots : {diff.lotsCountA} → {diff.lotsCountB}</span>
                  <span>Documents : {diff.documentsCountA} → {diff.documentsCountB}</span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
