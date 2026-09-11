import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency, formatDate } from '@/lib/format';
import { useFractionalStressTests, useFractionalICRecommendation, useCreateICDecision } from '../hooks/use-fractional';
import { STRESS_SCENARIO_LABELS, IC_DECISION_STATUS_LABELS, type FractionalICDecision, type FractionalAssumptionSet } from '@/types';
import { AssumptionsCard } from './assumptions-card';

const IC_STATUS_VARIANT = {
  APPROVE: 'success',
  APPROVE_SUBJECT_TO_CONDITIONS: 'warning',
  RESTRUCTURE: 'warning',
  HOLD: 'outline',
  DECLINE: 'destructive',
} as const;

function pct(value: number | null | undefined, digits = 1): string {
  return value === null || value === undefined ? '—' : `${value.toFixed(digits)} %`;
}

/** Onglet Risque & IC (spec V3 §17/§18) — hypothèses, Stress Testing Engine (10 scénarios) + recommandation/décision IC. */
export function RisqueIcTab({ projectId, icDecisions, assumptionSets }: { projectId: string; icDecisions: FractionalICDecision[]; assumptionSets: FractionalAssumptionSet[] }) {
  const { data: scenarios, isLoading: scenariosLoading } = useFractionalStressTests(projectId);
  const { data: recommendation, isLoading: recommendationLoading } = useFractionalICRecommendation(projectId);
  const createDecision = useCreateICDecision(projectId);
  const [notes, setNotes] = useState('');

  const handleRecordDecision = () => {
    if (!recommendation) return;
    createDecision.mutate({
      status: recommendation.status,
      hardStops: recommendation.hardStops,
      conditions: recommendation.conditions,
      watchItems: recommendation.watchItems,
      recommendation: notes ? `${recommendation.recommendation} — ${notes}` : recommendation.recommendation,
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <AssumptionsCard projectId={projectId} assumptionSets={assumptionSets} />

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Stress Testing — 10 scénarios</CardTitle>
        </CardHeader>
        <CardContent>
          {scenariosLoading && <Skeleton className="h-48" />}
          {scenarios && (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Scénario</TableHead>
                    <TableHead>Investor Net Yield</TableHead>
                    <TableHead>Secured Net Yield</TableHead>
                    <TableHead>TRI</TableHead>
                    <TableHead>Multiple</TableHead>
                    <TableHead>Perte max.</TableHead>
                    <TableHead>Années sous hurdle</TableHead>
                    <TableHead>Éligibilité</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {scenarios.map((s) => (
                    <TableRow key={s.scenario} className={s.scenario === 'BASE' ? 'font-medium' : undefined}>
                      <TableCell>{STRESS_SCENARIO_LABELS[s.scenario]}</TableCell>
                      <TableCell>{pct(s.investorNetYieldPct)}</TableCell>
                      <TableCell>{pct(s.securedNetYieldPct)}</TableCell>
                      <TableCell>{pct(s.irrPct)}</TableCell>
                      <TableCell>{s.equityMultiple !== null ? `${s.equityMultiple.toFixed(2)}x` : '—'}</TableCell>
                      <TableCell>{s.maxLoss > 0 ? formatCurrency(s.maxLoss) : '—'}</TableCell>
                      <TableCell>{s.yearsUnderHurdle}</TableCell>
                      <TableCell>
                        <Badge variant={s.eligibility.verdict === 'ELIGIBLE' ? 'success' : s.eligibility.verdict === 'MARGINAL' ? 'warning' : 'destructive'}>
                          {s.eligibility.verdict}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Comité d'investissement</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {recommendationLoading && <Skeleton className="h-32" />}
          {recommendation && (
            <>
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">Recommandation :</span>
                <Badge variant={IC_STATUS_VARIANT[recommendation.status]}>{IC_DECISION_STATUS_LABELS[recommendation.status]}</Badge>
              </div>
              <p className="text-sm">{recommendation.recommendation}</p>
              {recommendation.hardStops.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-destructive">Hard stops</p>
                  <ul className="list-inside list-disc text-sm text-destructive">
                    {recommendation.hardStops.map((h, i) => (
                      <li key={i}>{h}</li>
                    ))}
                  </ul>
                </div>
              )}
              {recommendation.conditions.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-warning">Conditions préalables</p>
                  <ul className="list-inside list-disc text-sm">
                    {recommendation.conditions.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )}
              {recommendation.watchItems.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Points de vigilance</p>
                  <ul className="list-inside list-disc text-sm text-muted-foreground">
                    {recommendation.watchItems.map((w, i) => (
                      <li key={i}>{w}</li>
                    ))}
                  </ul>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Textarea placeholder="Notes complémentaires (optionnel)" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
              </div>
              <div>
                <Button onClick={handleRecordDecision} disabled={createDecision.isPending}>
                  {createDecision.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
                  Enregistrer cette décision
                </Button>
              </div>
            </>
          )}

          {icDecisions.length > 0 && (
            <div className="mt-2">
              <p className="mb-2 text-xs font-medium text-muted-foreground">Historique des décisions</p>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Statut</TableHead>
                    <TableHead>Version</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {icDecisions.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{formatDate(d.decidedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={IC_STATUS_VARIANT[d.status]}>{IC_DECISION_STATUS_LABELS[d.status]}</Badge>
                      </TableCell>
                      <TableCell>v{d.version}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
