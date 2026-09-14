import { useState } from 'react';
import { Loader2, Plus, Trash2, ChevronDown, ChevronRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  usePlatformProfiles,
  useFractionalScoreCategories,
  useCreateScoreCategory,
  useDeleteScoreCategory,
  useCreateScoreCriterion,
  useDeleteScoreCriterion,
  useCreateScoreBucket,
  useDeleteScoreBucket,
  useFractionalEliminatoryRules,
  useCreateEliminatoryRule,
  useDeleteEliminatoryRule,
} from '../hooks/use-fractional';
import {
  ELIMINATORY_METRIC_LABELS,
  ELIMINATORY_OPERATOR_LABELS,
  type EliminatoryComparisonOperator,
  type EliminatoryMetricKey,
  type FractionalScoreCategory,
  type FractionalScoreCriterion,
} from '@/types';

const METRIC_KEYS = Object.keys(ELIMINATORY_METRIC_LABELS) as EliminatoryMetricKey[];
const OPERATORS = Object.keys(ELIMINATORY_OPERATOR_LABELS) as EliminatoryComparisonOperator[];

const EMPTY_CATEGORY_FORM = { assetType: '', label: '', maxPoints: '' };
const EMPTY_RULE_FORM = { assetType: '', platformProfileId: '', label: '', metricKey: METRIC_KEYS[0], operator: 'GTE' as EliminatoryComparisonOperator, threshold: '', failMessage: '' };

function groupByAssetType(categories: FractionalScoreCategory[]): [string | null, FractionalScoreCategory[]][] {
  const map = new Map<string | null, FractionalScoreCategory[]>();
  for (const c of categories) {
    const key = c.assetType;
    map.set(key, [...(map.get(key) ?? []), c]);
  }
  return [...map.entries()].sort(([a], [b]) => (a === null ? -1 : b === null ? 1 : a.localeCompare(b)));
}

function CriterionEditor({ criterion }: { criterion: FractionalScoreCriterion }) {
  const createBucket = useCreateScoreBucket();
  const deleteBucket = useDeleteScoreBucket();
  const deleteCriterion = useDeleteScoreCriterion();
  const [bucketForm, setBucketForm] = useState({ label: '', points: '', isEliminatory: false });

  const handleAddBucket = (e: React.FormEvent) => {
    e.preventDefault();
    createBucket.mutate(
      { criterionId: criterion.id, label: bucketForm.label, points: Number(bucketForm.points) || 0, isEliminatory: bucketForm.isEliminatory },
      { onSuccess: () => setBucketForm({ label: '', points: '', isEliminatory: false }) },
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-md border border-border/60 p-2.5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{criterion.label}</span>
        <Button variant="ghost" size="icon" onClick={() => deleteCriterion.mutate(criterion.id)} disabled={deleteCriterion.isPending}>
          <Trash2 className="h-3.5 w-3.5" />
        </Button>
      </div>
      {criterion.sourceField && <span className="text-[11px] text-muted-foreground">Champ indicatif : {criterion.sourceField}</span>}
      <div className="flex flex-col gap-1.5">
        {criterion.buckets.map((b) => (
          <div key={b.id} className="flex items-center justify-between gap-2 rounded bg-muted/40 px-2 py-1 text-xs">
            <span className="flex items-center gap-1.5">
              {b.label} — {b.points} pts
              {b.isEliminatory && (
                <Badge variant="destructive" className="text-[10px]">
                  Éliminatoire
                </Badge>
              )}
            </span>
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deleteBucket.mutate(b.id)} disabled={deleteBucket.isPending}>
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ))}
      </div>
      <form onSubmit={handleAddBucket} className="flex flex-wrap items-end gap-2">
        <div className="flex flex-col gap-1">
          <Label className="text-[11px]">Réponse</Label>
          <Input className="h-7 w-40 text-xs" required value={bucketForm.label} onChange={(e) => setBucketForm((p) => ({ ...p, label: e.target.value }))} />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-[11px]">Points</Label>
          <Input
            className="h-7 w-20 text-xs"
            type="number"
            required
            value={bucketForm.points}
            onChange={(e) => setBucketForm((p) => ({ ...p, points: e.target.value }))}
          />
        </div>
        <label className="flex items-center gap-1.5 pb-1.5 text-[11px]">
          <input type="checkbox" className="h-3 w-3 accent-primary" checked={bucketForm.isEliminatory} onChange={(e) => setBucketForm((p) => ({ ...p, isEliminatory: e.target.checked }))} />
          Éliminatoire
        </label>
        <Button type="submit" size="sm" variant="outline" className="h-7 text-xs" disabled={createBucket.isPending}>
          <Plus className="h-3 w-3" />
          Réponse
        </Button>
      </form>
    </div>
  );
}

function CategoryEditor({ category }: { category: FractionalScoreCategory }) {
  const [expanded, setExpanded] = useState(false);
  const createCriterion = useCreateScoreCriterion();
  const deleteCategory = useDeleteScoreCategory();
  const [criterionForm, setCriterionForm] = useState({ label: '', sourceField: '' });

  const handleAddCriterion = (e: React.FormEvent) => {
    e.preventDefault();
    createCriterion.mutate(
      { categoryId: category.id, label: criterionForm.label, sourceField: criterionForm.sourceField || undefined },
      { onSuccess: () => setCriterionForm({ label: '', sourceField: '' }) },
    );
  };

  return (
    <div className="flex flex-col gap-2 rounded-lg border border-border p-3">
      <div className="flex items-center justify-between">
        <button type="button" className="flex items-center gap-1.5 text-sm font-medium" onClick={() => setExpanded((e) => !e)}>
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          {category.label}
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">{category.maxPoints} pts max · {category.criteria.length} critère(s)</span>
          <Button variant="ghost" size="icon" onClick={() => deleteCategory.mutate(category.id)} disabled={deleteCategory.isPending}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {expanded && (
        <div className="flex flex-col gap-2 pl-2">
          {category.criteria.map((crit) => (
            <CriterionEditor key={crit.id} criterion={crit} />
          ))}
          <form onSubmit={handleAddCriterion} className="flex flex-wrap items-end gap-2">
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Nouveau critère</Label>
              <Input className="h-7 w-48 text-xs" required value={criterionForm.label} onChange={(e) => setCriterionForm((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-[11px]">Champ indicatif (optionnel)</Label>
              <Input className="h-7 w-40 text-xs" value={criterionForm.sourceField} onChange={(e) => setCriterionForm((p) => ({ ...p, sourceField: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" variant="outline" className="h-7 text-xs" disabled={createCriterion.isPending}>
              <Plus className="h-3 w-3" />
              Critère
            </Button>
          </form>
        </div>
      )}
    </div>
  );
}

/**
 * Éditeur de barème (Complément H, points 1/8) — jusqu'ici uniquement
 * accessible via des appels API directs (fit-scoring.controller.ts n'a
 * qu'un CRUD sans interface). Catégories/critères/buckets et règles
 * éliminatoires sont partagés au niveau organisation (comme
 * RentIndexSeries/MarketComparablePool) — pas de notion de "brouillon",
 * chaque ajout est immédiatement utilisable par tous les dossiers dont le
 * barème résolu correspond (assetType spécifique ou générique).
 */
export function BaremeEditor() {
  const { data: categories } = useFractionalScoreCategories();
  const { data: rules } = useFractionalEliminatoryRules();
  const { data: profiles } = usePlatformProfiles();
  const createCategory = useCreateScoreCategory();
  const createRule = useCreateEliminatoryRule();
  const deleteRule = useDeleteEliminatoryRule();

  const [categoryForm, setCategoryForm] = useState(EMPTY_CATEGORY_FORM);
  const [ruleForm, setRuleForm] = useState(EMPTY_RULE_FORM);

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    createCategory.mutate(
      { assetType: categoryForm.assetType || undefined, label: categoryForm.label, maxPoints: Number(categoryForm.maxPoints) || 0 },
      { onSuccess: () => setCategoryForm(EMPTY_CATEGORY_FORM) },
    );
  };

  const handleAddRule = (e: React.FormEvent) => {
    e.preventDefault();
    createRule.mutate(
      {
        assetType: ruleForm.assetType || undefined,
        platformProfileId: ruleForm.platformProfileId || undefined,
        label: ruleForm.label,
        metricKey: ruleForm.metricKey,
        operator: ruleForm.operator,
        threshold: Number(ruleForm.threshold) || 0,
        failMessage: ruleForm.failMessage,
      },
      { onSuccess: () => setRuleForm(EMPTY_RULE_FORM) },
    );
  };

  const grouped = groupByAssetType(categories ?? []);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Catégories, critères et buckets</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {grouped.length === 0 && <p className="text-sm text-muted-foreground">Aucune catégorie configurée.</p>}
          {grouped.map(([assetType, cats]) => (
            <div key={assetType ?? 'GENERIC'} className="flex flex-col gap-2">
              <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{assetType ?? 'Barème générique'}</span>
              {cats.map((cat) => (
                <CategoryEditor key={cat.id} category={cat} />
              ))}
            </div>
          ))}
          <form onSubmit={handleAddCategory} className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Nouvelle catégorie</Label>
              <Input className="w-48" required value={categoryForm.label} onChange={(e) => setCategoryForm((p) => ({ ...p, label: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Points max</Label>
              <Input className="w-24" type="number" required value={categoryForm.maxPoints} onChange={(e) => setCategoryForm((p) => ({ ...p, maxPoints: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Typologie (optionnel)</Label>
              <Input className="w-40" placeholder="ex. Commerce" value={categoryForm.assetType} onChange={(e) => setCategoryForm((p) => ({ ...p, assetType: e.target.value }))} />
            </div>
            <Button type="submit" size="sm" disabled={createCategory.isPending}>
              {createCategory.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Catégorie
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Règles éliminatoires</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          {(rules ?? []).length === 0 && <p className="text-sm text-muted-foreground">Aucune règle éliminatoire configurée.</p>}
          <div className="flex flex-col gap-2">
            {(rules ?? []).map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-2 rounded-md border border-border/60 p-2.5 text-sm">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">{r.label}</span>
                  <span className="text-xs text-muted-foreground">
                    {ELIMINATORY_METRIC_LABELS[r.metricKey]} {ELIMINATORY_OPERATOR_LABELS[r.operator]} {r.threshold}
                    {r.assetType ? ` · ${r.assetType}` : ' · toutes typologies'}
                    {r.platformProfileId ? ` · ${profiles?.find((p) => p.id === r.platformProfileId)?.platformName ?? 'plateforme'}` : ''}
                  </span>
                </div>
                <Button variant="ghost" size="icon" onClick={() => deleteRule.mutate(r.id)} disabled={deleteRule.isPending}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
          <form onSubmit={handleAddRule} className="flex flex-col gap-3 border-t border-border pt-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Libellé</Label>
                <Input required value={ruleForm.label} onChange={(e) => setRuleForm((p) => ({ ...p, label: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Métrique</Label>
                <Select value={ruleForm.metricKey} onValueChange={(v) => setRuleForm((p) => ({ ...p, metricKey: v as EliminatoryMetricKey }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {METRIC_KEYS.map((k) => (
                      <SelectItem key={k} value={k}>
                        {ELIMINATORY_METRIC_LABELS[k]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Opérateur</Label>
                <Select value={ruleForm.operator} onValueChange={(v) => setRuleForm((p) => ({ ...p, operator: v as EliminatoryComparisonOperator }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {OPERATORS.map((op) => (
                      <SelectItem key={op} value={op}>
                        {ELIMINATORY_OPERATOR_LABELS[op]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Seuil</Label>
                <Input type="number" step="0.01" required value={ruleForm.threshold} onChange={(e) => setRuleForm((p) => ({ ...p, threshold: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Typologie (optionnel)</Label>
                <Input placeholder="ex. Commerce" value={ruleForm.assetType} onChange={(e) => setRuleForm((p) => ({ ...p, assetType: e.target.value }))} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-xs">Plateforme (optionnel)</Label>
                <Select value={ruleForm.platformProfileId || undefined} onValueChange={(v) => setRuleForm((p) => ({ ...p, platformProfileId: v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="Toutes plateformes" />
                  </SelectTrigger>
                  <SelectContent>
                    {(profiles ?? []).map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.platformName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs">Message si non conforme</Label>
              <Input required value={ruleForm.failMessage} onChange={(e) => setRuleForm((p) => ({ ...p, failMessage: e.target.value }))} />
            </div>
            <div>
              <Button type="submit" size="sm" disabled={createRule.isPending}>
                {createRule.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                Règle éliminatoire
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
