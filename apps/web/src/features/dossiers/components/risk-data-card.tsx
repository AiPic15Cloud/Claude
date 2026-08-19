import { TriangleAlert, Waves, Landmark, MapPinned, Zap, Activity } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useRiskData, useDpe } from '../hooks/use-risk-data';
import { formatDate } from '@/lib/format';

const ZONE_LABEL: Record<string, string> = {
  U: 'Zone urbaine (constructible)',
  AU: 'Zone à urbaniser',
  A: 'Zone agricole',
  N: 'Zone naturelle protégée',
};

const DPE_VARIANT: Record<string, 'success' | 'warning' | 'destructive'> = {
  A: 'success',
  B: 'success',
  C: 'warning',
  D: 'warning',
  E: 'warning',
  F: 'destructive',
  G: 'destructive',
};

/** Niveaux observés en production : "faible", "modéré", "moyen", "fort", "important". */
function niveauVariant(niveau: string | null): 'outline' | 'warning' | 'destructive' {
  if (!niveau) return 'outline';
  const lower = niveau.toLowerCase();
  if (lower.includes('fort') || lower.includes('important')) return 'destructive';
  if (lower.includes('modéré') || lower.includes('moyen')) return 'warning';
  return 'outline';
}

export function RiskDataCard({ dealId, hasCoords, hasPostcode }: { dealId: string; hasCoords: boolean; hasPostcode: boolean }) {
  const { data, isLoading, isError } = useRiskData(dealId, hasCoords);
  const { data: dpe, isLoading: dpeLoading } = useDpe(dealId, hasPostcode);

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
                <p className="text-sm font-medium">Risque inondation</p>
                {data.floodZone === null ? (
                  <p className="text-xs text-muted-foreground">Indisponible</p>
                ) : !data.floodZone.present ? (
                  <p className="text-xs text-muted-foreground">Aucun risque d'inondation identifié sur la commune</p>
                ) : (
                  <Badge variant={niveauVariant(data.floodZone.niveau)}>{data.floodZone.niveau ?? 'Risque existant'}</Badge>
                )}
              </div>
            </div>

            <div className="flex items-start gap-3 rounded-md border border-border p-3">
              <Activity className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1">
                <p className="text-sm font-medium">Risque sismique</p>
                {data.seismicZone === null ? (
                  <p className="text-xs text-muted-foreground">Indisponible</p>
                ) : !data.seismicZone.present ? (
                  <p className="text-xs text-muted-foreground">Aucun risque sismique identifié sur la commune</p>
                ) : (
                  <Badge variant={niveauVariant(data.seismicZone.niveau)}>{data.seismicZone.niveau ?? 'Risque existant'}</Badge>
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

            {hasPostcode && (
              <div className="flex items-start gap-3 rounded-md border border-border p-3">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                <div className="flex-1">
                  <p className="text-sm font-medium">Diagnostic de performance énergétique (DPE)</p>
                  {dpeLoading ? (
                    <Skeleton className="mt-1 h-5 w-32" />
                  ) : !dpe || !dpe.label ? (
                    <p className="text-xs text-muted-foreground">Aucun DPE trouvé pour cette adresse</p>
                  ) : (
                    <>
                      <div className="mt-1 flex items-center gap-2">
                        <Badge variant={DPE_VARIANT[dpe.label] ?? 'outline'}>Énergie {dpe.label}</Badge>
                        {dpe.ghgLabel && <Badge variant={DPE_VARIANT[dpe.ghgLabel] ?? 'outline'}>GES {dpe.ghgLabel}</Badge>}
                        {dpe.date && <span className="text-xs text-muted-foreground">{formatDate(dpe.date)}</span>}
                      </div>
                      {dpe.matchedAddress && (
                        <p className="mt-0.5 text-[11px] text-muted-foreground">Correspondance approximative : {dpe.matchedAddress}</p>
                      )}
                    </>
                  )}
                </div>
              </div>
            )}

            <p className="text-[11px] text-muted-foreground">
              Sources : Géorisques (gouv.fr) — catastrophes naturelles, zones inondables · API Carto GPU (IGN) — zonage PLU ·
              OpenStreetMap (Overpass) — équipements à proximité · ADEME — DPE. Données indicatives, à confirmer par un
              professionnel avant toute décision d'investissement.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
