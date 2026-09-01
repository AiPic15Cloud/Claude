import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/lib/format';
import type { CityExposureEntry, OperatorConcentrationEntry } from '@/types';

/**
 * Concentration/contrepartie par opérateur + géographie (spec ATLAS v2, A.8).
 * `groupEconomiqueAdditionalExposure` (B.3) est affiché à part, jamais
 * fusionné dans le CRD principal de l'opérateur — doctrine section 0 :
 * une agrégation dérivée du Knowledge Graph doit rester distinguable de
 * la donnée directe.
 */
export function ConcentrationCard({ operators, cities }: { operators: OperatorConcentrationEntry[]; cities: CityExposureEntry[] }) {
  if (operators.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle>Concentration</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="py-6 text-center text-xs text-muted-foreground">Aucun dossier actif.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle>Concentration</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div>
          <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Top opérateurs</p>
          <div className="flex flex-col gap-1.5">
            {operators.map((op) => (
              <div key={op.porteurSiren ?? '__UNKNOWN__'} className="flex items-center justify-between gap-2 text-sm">
                <span className="min-w-0 flex-1 truncate">
                  {op.porteurSociete ?? op.porteurSiren ?? 'Porteur non renseigné'}
                  {op.dealCount > 1 && <span className="text-xs text-muted-foreground"> ({op.dealCount} dossiers)</span>}
                </span>
                <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{formatCurrency(op.crd)}</span>
                {Boolean(op.groupEconomiqueAdditionalExposure) && (
                  <Badge variant="outline" className="shrink-0">
                    +groupe économique : {formatCurrency(op.groupEconomiqueAdditionalExposure!)}
                  </Badge>
                )}
              </div>
            ))}
          </div>
        </div>

        {cities.length > 0 && (
          <div>
            <p className="mb-1.5 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Top villes</p>
            <div className="flex flex-col gap-1.5">
              {cities.slice(0, 5).map((c) => (
                <div key={c.city} className="flex items-center justify-between gap-2 text-sm">
                  <span className="min-w-0 flex-1 truncate">{c.city}</span>
                  <span className="shrink-0 font-mono tabular-nums text-muted-foreground">{formatCurrency(c.crd)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
