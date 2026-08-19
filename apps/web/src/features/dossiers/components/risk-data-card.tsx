import { TriangleAlert, Waves, Landmark, MapPinned } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRiskData } from '../hooks/use-risk-data';
import { formatDate } from '@/lib/format';

const ZONE_LABEL: Record<string, string> = {
  U: 'Zone urbaine (constructible)',
  AU: 'Zone à urbaniser',
  A: 'Zone agricole',
  N: 'Zone naturelle protégée',
};

export function RiskDataCard({ dealId, hasCoords }: { dealId: string; hasCoords: boolean }) {
  const { data, isLoading, isError } = useRiskData(dealId, hasCoords);

  if (!hasCoords) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Risques &amp; urbanisme</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {isLoading && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        )}

        {(isError || (!isLoading && !data)) && <p className="text-xs text-muted-foreground">Données de risque indisponibles pour le moment.</p>}

        {data && (
          <>
            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Catastrophes naturelles reconnues (2 km)</p>
                {data.catnat === null ? (
                  <p className="text-xs text-muted-foreground">Indisponible</p>
                ) : data.catnat.count === 0 ? (
                  <p className="text-xs text-muted-foreground">Aucun arrêté CatNat recensé à proximité</p>
                ) : (
                  <>
                    <p className="text-xs text-muted-foreground">{data.catnat.count} arrêté(s) recensé(s)</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {data.catnat.recent.map((r, i) => (
                        <Badge key={i} variant="outline">
                          {r.libelle ?? 'Événement'} {r.dateDebut && `— ${formatDate(r.dateDebut)}`}
                        </Badge>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Waves className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Zone inondable (Atlas des zones inondables)</p>
                {data.floodZone === null ? (
                  <p className="text-xs text-muted-foreground">Indisponible</p>
                ) : data.floodZone.count > 0 ? (
                  <Badge variant="warning">Zone à risque identifiée à proximité</Badge>
                ) : (
                  <p className="text-xs text-muted-foreground">Aucune zone inondable cartographiée à proximité</p>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Landmark className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Zonage PLU</p>
                {data.zonage === null || data.zonage.length === 0 ? (
                  <p className="text-xs text-muted-foreground">Indisponible ou hors périmètre PLU numérisé</p>
                ) : (
                  <div className="mt-1 flex flex-col gap-1">
                    {data.zonage.map((z, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <Badge variant="outline">{z.type ? (ZONE_LABEL[z.type] ?? z.type) : 'Zone'}</Badge>
                        {z.libelle && <span className="text-xs text-muted-foreground">{z.libelle}</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <MapPinned className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Équipements à proximité</p>
                {data.nearby === null ? (
                  <p className="text-xs text-muted-foreground">Indisponible</p>
                ) : (
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge variant="outline">{data.nearby.schools} école(s)/1km</Badge>
                    <Badge variant="outline">{data.nearby.healthcare} santé/1km</Badge>
                    <Badge variant="outline">{data.nearby.shops} commerce(s)/500m</Badge>
                    <Badge variant="outline">{data.nearby.transitStops} arrêt(s) transport</Badge>
                  </div>
                )}
              </div>
            </div>

            <p className="text-[11px] text-muted-foreground">
              Sources : Géorisques (gouv.fr) — catastrophes naturelles, zones inondables · API Carto GPU (IGN) — zonage PLU ·
              OpenStreetMap (Overpass) — équipements à proximité. Données indicatives, à confirmer par un professionnel avant toute
              décision d'investissement.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
