import { useState } from 'react';
import { Loader2, Pencil } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { DecimalInput } from '@/components/ui/decimal-input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCurrency } from '@/lib/format';
import { parseLocaleNumber } from '@/lib/locale-number';
import { useStructureRevenueForecast, useUpsertStructureTarget } from '../hooks/use-fractional';
import {
  REVENUE_FORECAST_CATEGORY_LABELS,
  STRUCTURE_TARGET_BASES,
  STRUCTURE_TARGET_BASIS_LABELS,
  type RevenueForecastCategory,
  type StructureTargetBasis,
} from '@/types';

const CATEGORIES: RevenueForecastCategory[] = ['REALISE', 'CONTRACTUALISE', 'PROPOSE', 'HYPOTHETIQUE'];

/**
 * Prévision des flux de la structure (spec Cockpit/Fractionné P2 §5.5) —
 * réalisé/contractualisé/proposé/hypothétique en colonnes distinctes,
 * jamais un chiffre unique. La cible annuelle n'est jamais présumée : elle
 * reste "non définie" tant qu'elle n'a pas été explicitement renseignée
 * (spec §10 Q3 — définition à arbitrer entre les associés).
 */
export function StructureRevenueForecastCard({ year }: { year: number }) {
  const { data, isLoading } = useStructureRevenueForecast(year);
  const upsertTarget = useUpsertStructureTarget(year);
  const [editingTarget, setEditingTarget] = useState(false);
  const [targetForm, setTargetForm] = useState<{ amount: string; basis: StructureTargetBasis | '' }>({ amount: '', basis: '' });

  if (isLoading) return <Skeleton className="h-40" />;
  if (!data) return null;

  const startEditTarget = () => {
    setTargetForm({
      amount: data.target?.targetAmountEur ? String(data.target.targetAmountEur) : '',
      basis: data.target?.targetBasis ?? '',
    });
    setEditingTarget(true);
  };

  const handleSaveTarget = () => {
    upsertTarget.mutate(
      { targetAmountEur: targetForm.amount ? parseLocaleNumber(targetForm.amount) : undefined, targetBasis: targetForm.basis || undefined },
      { onSuccess: () => setEditingTarget(false) },
    );
  };

  const totalQuantified = CATEGORIES.reduce((sum, c) => sum + data.totalsByCategory[c], 0);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-base">Prévision des flux de la structure — {year}</CardTitle>
        {!editingTarget && (
          <Button size="sm" variant="ghost" onClick={startEditTarget}>
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {CATEGORIES.map((c) => (
            <div key={c} className="flex flex-col gap-1 rounded-lg border border-border p-3">
              <span className="text-xs text-muted-foreground">{REVENUE_FORECAST_CATEGORY_LABELS[c]}</span>
              <span className="font-mono text-lg tabular-nums">{formatCurrency(data.totalsByCategory[c])}</span>
            </div>
          ))}
        </div>

        {data.unquantifiedCount > 0 && (
          <p className="text-xs text-muted-foreground">
            {data.unquantifiedCount} frais au taux non inclus dans ces totaux (assiette non calculable ici) — non ignorés, juste non chiffrés.
          </p>
        )}

        {editingTarget ? (
          <div className="flex flex-wrap items-end gap-3 border-t border-border pt-3">
            <div className="flex flex-col gap-1.5">
              <Label>Cible annuelle (€)</Label>
              <DecimalInput className="w-40" value={targetForm.amount} onChange={(e) => setTargetForm((f) => ({ ...f, amount: e.target.value }))} />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label>Définition</Label>
              <Select value={targetForm.basis || undefined} onValueChange={(v) => setTargetForm((f) => ({ ...f, basis: v as StructureTargetBasis }))}>
                <SelectTrigger className="w-56">
                  <SelectValue placeholder="Non définie…" />
                </SelectTrigger>
                <SelectContent>
                  {STRUCTURE_TARGET_BASES.map((b) => (
                    <SelectItem key={b} value={b}>
                      {STRUCTURE_TARGET_BASIS_LABELS[b]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" variant="outline" onClick={() => setEditingTarget(false)}>
              Annuler
            </Button>
            <Button size="sm" onClick={handleSaveTarget} disabled={upsertTarget.isPending}>
              {upsertTarget.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
              Enregistrer
            </Button>
          </div>
        ) : (
          <div className="border-t border-border pt-3 text-sm">
            {data.target?.targetAmountEur ? (
              <>
                <span className="font-medium">Cible : {formatCurrency(data.target.targetAmountEur)}</span>
                <span className="ml-2 text-muted-foreground">
                  ({data.target.targetBasis ? STRUCTURE_TARGET_BASIS_LABELS[data.target.targetBasis] : 'définition non précisée'})
                </span>
                {data.target.targetBasis && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Écart au réalisé + contractualisé : {formatCurrency(totalQuantified - data.target.targetAmountEur)}
                  </p>
                )}
              </>
            ) : (
              <span className="text-muted-foreground">Cible non définie — aucun écart affiché tant qu'elle ne l'est pas.</span>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
