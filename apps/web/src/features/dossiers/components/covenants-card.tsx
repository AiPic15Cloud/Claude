import { Fragment } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Covenants } from '@/types';

function statusBadge(breached: boolean | null) {
  if (breached === null) return <Badge variant="outline">Non calculable</Badge>;
  return breached ? <Badge variant="destructive">Rupture</Badge> : <Badge variant="success">OK</Badge>;
}

/**
 * Ratios de covenant (spec ATLAS v2, module MARKO F.3). Seuils par
 * typologie indicatifs (covenant.util.ts, valeurs illustratives non
 * calibrées sur la politique de risque réelle de LPB — cf. commentaire du
 * fichier). ICR/DSCR restent "Non calculable" tant que l'analyste n'a pas
 * renseigné le résultat opérationnel / flux de trésorerie estimés dans le
 * modèle financier ci-contre — jamais une valeur par défaut inventée.
 */
export function CovenantsCard({ covenants }: { covenants: Covenants }) {
  const rows = [
    { label: 'LTV', value: covenants.ltvPct, unit: '%', threshold: `< ${covenants.ltvThresholdPct}%`, breached: covenants.ltvBreached },
    { label: 'ICR', value: covenants.icr, unit: 'x', threshold: `> ${covenants.icrThreshold}x`, breached: covenants.icrBreached },
    { label: 'DSCR', value: covenants.dscr, unit: 'x', threshold: `> ${covenants.dscrThreshold}x`, breached: covenants.dscrBreached },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Ratios de covenant</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2">
        <p className="text-xs text-muted-foreground">
          Seuils indicatifs par typologie d'opération — à valider avant tout usage en décision réelle.
        </p>
        <div className="grid grid-cols-[1fr_auto_auto_auto] items-center gap-x-4 gap-y-2 text-sm">
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Ratio</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Valeur</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Seuil</span>
          <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Statut</span>
          {rows.map((row) => (
            <Fragment key={row.label}>
              <span className="font-medium">{row.label}</span>
              <span className="tabular-nums">{row.value !== null ? `${row.value}${row.unit}` : '—'}</span>
              <span className="text-muted-foreground">{row.threshold}</span>
              <span>{statusBadge(row.breached)}</span>
            </Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
