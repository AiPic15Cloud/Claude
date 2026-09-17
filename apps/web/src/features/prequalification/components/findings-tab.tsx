import { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCreateFinding, useReviewFinding } from '../hooks/use-prequalification';
import {
  FINDING_CATEGORY_LABELS,
  FINDING_SEVERITY_LABELS,
  FINDING_REVIEW_STATUS_LABELS,
  type Finding,
  type FindingCategory,
  type FindingSeverity,
  type FindingReviewStatus,
} from '@/types';

const SEVERITY_VARIANT: Record<FindingSeverity, 'default' | 'outline' | 'secondary' | 'destructive'> = {
  INFO: 'outline',
  POSITIVE: 'default',
  WATCH: 'secondary',
  MATERIAL: 'secondary',
  BLOCKING: 'destructive',
};

const CATEGORIES = Object.keys(FINDING_CATEGORY_LABELS) as FindingCategory[];
const SEVERITIES = Object.keys(FINDING_SEVERITY_LABELS) as FindingSeverity[];
const REVIEW_ACTIONS: FindingReviewStatus[] = ['ACCEPTED', 'REJECTED', 'AMENDED'];

/**
 * Findings (spec §11-12) : générés automatiquement par les contrôles
 * arithmétiques (RULE, ruleId non null, recalculés à chaque sauvegarde du
 * bilan — voir prequalification.service.ts#recomputeFinancials) ou ajoutés
 * manuellement par un analyste (ANALYST). Un BLOCKING non résolu (PENDING
 * ou ACCEPTED) empêche une validation en GO — voir promotion.service.ts.
 */
export function FindingsTab({ caseId, findings }: { caseId: string; findings: Finding[] }) {
  const create = useCreateFinding(caseId);
  const review = useReviewFinding(caseId);
  const [form, setForm] = useState({ category: 'FINANCIAL' as FindingCategory, severity: 'WATCH' as FindingSeverity, statement: '', rationale: '' });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.statement || !form.rationale) return;
    create.mutate(form, { onSuccess: () => setForm({ ...form, statement: '', rationale: '' }) });
  };

  const sorted = [...findings].sort((a, b) => SEVERITIES.indexOf(a.severity) - SEVERITIES.indexOf(b.severity));

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Findings</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {sorted.length === 0 && <p className="py-4 text-center text-sm text-muted-foreground">Aucun finding pour l'instant.</p>}
          {sorted.map((finding) => (
            <div key={finding.id} className="flex flex-col gap-1.5 rounded-md border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={SEVERITY_VARIANT[finding.severity]}>{FINDING_SEVERITY_LABELS[finding.severity]}</Badge>
                <Badge variant="outline">{FINDING_CATEGORY_LABELS[finding.category]}</Badge>
                <span className="text-xs text-muted-foreground">
                  {finding.generatedBy === 'RULE' ? 'Contrôle automatique' : finding.generatedBy === 'MODEL' ? 'IA' : 'Analyste'}
                </span>
                <Badge variant={finding.reviewStatus === 'PENDING' ? 'secondary' : 'outline'} className="ml-auto">
                  {FINDING_REVIEW_STATUS_LABELS[finding.reviewStatus]}
                </Badge>
              </div>
              <p className="text-sm font-medium">{finding.statement}</p>
              <p className="text-xs text-muted-foreground">{finding.rationale}</p>
              <div className="mt-1 flex gap-2">
                {REVIEW_ACTIONS.map((action) => (
                  <Button
                    key={action}
                    variant={finding.reviewStatus === action ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => review.mutate({ findingId: finding.id, reviewStatus: action })}
                    disabled={review.isPending}
                  >
                    {FINDING_REVIEW_STATUS_LABELS[action]}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Ajouter un finding</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="flex flex-col gap-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <Label>Catégorie</Label>
                <Select value={form.category} onValueChange={(v) => setForm((p) => ({ ...p, category: v as FindingCategory }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {FINDING_CATEGORY_LABELS[c]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label>Sévérité</Label>
                <Select value={form.severity} onValueChange={(v) => setForm((p) => ({ ...p, severity: v as FindingSeverity }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {SEVERITIES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {FINDING_SEVERITY_LABELS[s]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Constat</Label>
              <Input value={form.statement} onChange={(e) => setForm((p) => ({ ...p, statement: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Justification</Label>
              <Textarea rows={2} value={form.rationale} onChange={(e) => setForm((p) => ({ ...p, rationale: e.target.value }))} />
            </div>
            <div>
              <Button type="submit" size="sm" disabled={create.isPending}>
                {create.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Ajouter
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
