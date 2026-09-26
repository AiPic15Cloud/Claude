import { useState } from 'react';
import { Settings2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDate } from '@/lib/format';
import { useFractionalBareme, useFractionalLatestAssessment, useSubmitScoreAssessment } from '../hooks/use-fractional';
import { BaremeEditor } from './bareme-editor';
import { SCORE_TIER_VERDICT_LABELS, ELIMINATORY_OPERATOR_LABELS, ELIMINATORY_METRIC_LABELS, type ScoreTierVerdict } from '@/types';

const VERDICT_VARIANT: Record<ScoreTierVerdict, 'success' | 'warning' | 'destructive'> = {
  GO_FORT: 'success',
  GO: 'success',
  CONDITIONNEL: 'warning',
  NO_GO: 'destructive',
};

/**
 * Onglet Fit (Complément H, points 1/8) — barème pondéré décomposable
 * jusqu'au dernier point + règles éliminatoires nommées, réconciliés en un
 * seul verdict (jamais deux verdicts non hiérarchisés côte à côte, cf. H.5).
 * Le barème (catégories/critères/buckets/règles) est partagé au niveau
 * organisation (comme RentIndexSeries) — l'éditeur repliable en tête de
 * l'onglet le modifie pour tous les dossiers, pas seulement celui-ci.
 */
export function FitTab({ projectId }: { projectId: string }) {
  const { data: bareme, isLoading: baremeLoading } = useFractionalBareme(projectId);
  const { data: latestAssessment, isLoading: assessmentLoading } = useFractionalLatestAssessment(projectId);
  const submitAssessment = useSubmitScoreAssessment(projectId);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [editorOpen, setEditorOpen] = useState(false);

  const categories = bareme?.categories ?? [];
  const totalCriteria = categories.reduce((sum, c) => sum + c.criteria.length, 0);
  const answeredCount = categories.reduce((sum, c) => sum + c.criteria.filter((crit) => answers[crit.id]).length, 0);

  const handleSubmit = () => {
    submitAssessment.mutate(Object.entries(answers).map(([criterionId, bucketId]) => ({ criterionId, bucketId })), {
      onSuccess: () => setAnswers({}),
    });
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={() => setEditorOpen((o) => !o)}>
          <Settings2 className="h-4 w-4" />
          {editorOpen ? 'Masquer l\'éditeur de barème' : 'Éditer le barème'}
        </Button>
      </div>

      {editorOpen && <BaremeEditor />}

      {baremeLoading && <Skeleton className="h-64" />}

      {bareme && categories.length === 0 && (
        <Card>
          <CardContent className="py-8 text-center text-sm text-muted-foreground">
            Aucun barème de scoring configuré pour ce type d'actif (ni de barème générique) — utilisez « Éditer le barème » ci-dessus.
          </CardContent>
        </Card>
      )}

      {categories.length > 0 && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Barème de scoring</CardTitle>
              <span className="text-xs text-muted-foreground">
                {answeredCount} / {totalCriteria} critères répondus
              </span>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {categories.map((category) => (
              <div key={category.id} className="flex flex-col gap-3 rounded-lg border border-border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{category.label}</span>
                  <span className="text-xs text-muted-foreground">{category.maxPoints} pts max</span>
                </div>
                {category.criteria.map((criterion) => (
                  <div key={criterion.id} className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                    <Label className="text-sm">{criterion.label}</Label>
                    <Select value={answers[criterion.id] ?? ''} onValueChange={(v) => setAnswers((a) => ({ ...a, [criterion.id]: v }))}>
                      <SelectTrigger className="w-full sm:w-64">
                        <SelectValue placeholder="Choisir une réponse..." />
                      </SelectTrigger>
                      <SelectContent>
                        {criterion.buckets.map((bucket) => (
                          <SelectItem key={bucket.id} value={bucket.id}>
                            {bucket.label} ({bucket.points} pts)
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            ))}
            {bareme && bareme.eliminatoryRules.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {bareme.eliminatoryRules.length} règle{bareme.eliminatoryRules.length > 1 ? 's' : ''} éliminatoire{bareme.eliminatoryRules.length > 1 ? 's' : ''} sera
                {bareme.eliminatoryRules.length > 1 ? 'ont' : ''} vérifiée{bareme.eliminatoryRules.length > 1 ? 's' : ''} automatiquement au calcul, à partir des chiffres déjà
                calculés du dossier (onglet Synthèse) — indépendamment de vos réponses ci-dessus.
              </p>
            )}
            <Button onClick={handleSubmit} disabled={submitAssessment.isPending || answeredCount === 0} className="self-start">
              {submitAssessment.isPending ? 'Calcul en cours…' : 'Calculer le verdict'}
            </Button>
          </CardContent>
        </Card>
      )}

      {assessmentLoading && <Skeleton className="h-48" />}

      {latestAssessment && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">Verdict</CardTitle>
              <Badge variant={VERDICT_VARIANT[latestAssessment.finalVerdict]}>{SCORE_TIER_VERDICT_LABELS[latestAssessment.finalVerdict]}</Badge>
            </div>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <p className="text-xs text-muted-foreground">Calculé le {formatDate(latestAssessment.scoredAt)}</p>

            <div className="flex flex-col gap-1">
              <div className="flex items-center justify-between text-sm">
                <span>Score pondéré</span>
                <span className="font-medium tabular-nums">
                  {latestAssessment.totalPoints} / {latestAssessment.maxPoints} pts ({latestAssessment.maxPoints > 0 ? ((latestAssessment.totalPoints / latestAssessment.maxPoints) * 100).toFixed(0) : 0}
                  %)
                </span>
              </div>
              <Progress value={latestAssessment.maxPoints > 0 ? (latestAssessment.totalPoints / latestAssessment.maxPoints) * 100 : 0} />
            </div>

            <div className="flex flex-col gap-2">
              {latestAssessment.categoryBreakdown.map((cat) => (
                <div key={cat.categoryId} className="flex flex-col gap-1">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>{cat.label}</span>
                    <span className="tabular-nums">
                      {cat.points} / {cat.maxPoints} pts
                    </span>
                  </div>
                  <Progress value={cat.pct} className="h-1.5" />
                </div>
              ))}
            </div>

            {latestAssessment.eliminatoryResults.length > 0 && (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Règle éliminatoire</TableHead>
                      <TableHead>Métrique observée</TableHead>
                      <TableHead>Seuil</TableHead>
                      <TableHead>Statut</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {latestAssessment.eliminatoryResults.map((r) => (
                      <TableRow key={r.ruleId}>
                        <TableCell>{r.label}</TableCell>
                        <TableCell>
                          {ELIMINATORY_METRIC_LABELS[r.metricKey]} = {r.observedValue === null ? '—' : r.observedValue}
                        </TableCell>
                        <TableCell>
                          {ELIMINATORY_OPERATOR_LABELS[r.operator]} {r.threshold}
                        </TableCell>
                        <TableCell>
                          <Badge variant={r.passed ? 'success' : 'destructive'}>{r.passed ? 'Conforme' : 'Non conforme'}</Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {latestAssessment.eliminatoryResults.some((r) => !r.passed) && (
                  <p className="mt-2 text-sm text-destructive">
                    {latestAssessment.eliminatoryResults
                      .filter((r) => !r.passed && r.failMessage)
                      .map((r) => r.failMessage)
                      .join(' · ')}
                  </p>
                )}
              </div>
            )}

            {latestAssessment.finalVerdict === 'NO_GO' && latestAssessment.eliminatoryResults.some((r) => !r.passed) && (
              <p className="text-xs text-muted-foreground">
                Verdict NO GO déterminé par une règle éliminatoire en échec — pas par le score pondéré (cf. tableau ci-dessus). Une règle dure supplante toujours le score, jamais l'inverse.
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
