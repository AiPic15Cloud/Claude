import { useMemo, useState } from 'react';
import { MapContainer, Marker, Tooltip, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useNavigate } from 'react-router-dom';
import { useDeals } from '@/features/portfolio/hooks/use-deals';
import { useEntities } from '@/features/knowledge-graph/hooks/use-graph';
import { StageBadge } from '@/features/portfolio/components/deal-badges';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { useThemeStore } from '@/store/theme.store';
import { formatCurrency } from '@/lib/format';
import { GRAPH_ENTITY_TYPE_LABELS } from '@/types';

const FRANCE_CENTER: [number, number] = [46.6, 2.4];

const dealIcon = L.divIcon({
  html: '<div style="width:12px;height:12px;border-radius:9999px;background:#0d9488;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: '',
  iconSize: [12, 12],
  iconAnchor: [6, 6],
});

const entityIcon = L.divIcon({
  html: '<div style="width:10px;height:10px;border-radius:2px;background:#f59e0b;border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>',
  className: '',
  iconSize: [10, 10],
  iconAnchor: [5, 5],
});

export function CartographiePage() {
  const [showDeals, setShowDeals] = useState(true);
  const [showEntities, setShowEntities] = useState(true);
  const theme = useThemeStore((s) => s.theme);
  const navigate = useNavigate();

  const { data: dealsData } = useDeals({ pageSize: 200 });
  const { data: entities = [] } = useEntities();

  const geoDeals = useMemo(() => (dealsData?.items ?? []).filter((d) => d.lat && d.lng), [dealsData]);
  const geoEntities = useMemo(() => entities.filter((e) => e.lat && e.lng), [entities]);

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Cartographie</h1>
          <p className="text-sm text-muted-foreground">Programmes et intervenants géolocalisés, avec filtres par couche.</p>
        </div>
        <Card>
          <CardContent className="flex items-center gap-5 p-3">
            <div className="flex items-center gap-2">
              <Switch id="layer-deals" checked={showDeals} onCheckedChange={setShowDeals} />
              <Label htmlFor="layer-deals" className="text-sm">
                Opérations ({geoDeals.length})
              </Label>
            </div>
            <div className="flex items-center gap-2">
              <Switch id="layer-entities" checked={showEntities} onCheckedChange={setShowEntities} />
              <Label htmlFor="layer-entities" className="text-sm">
                Intervenants ({geoEntities.length})
              </Label>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex-1 overflow-hidden rounded-lg border border-border">
        <MapContainer center={FRANCE_CENTER} zoom={6} className="h-full w-full" scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
            url={tileUrl}
          />
          {showDeals &&
            geoDeals.map((deal) => (
              <Marker
                key={deal.id}
                position={[Number(deal.lat), Number(deal.lng)]}
                icon={dealIcon}
                eventHandlers={{ click: () => navigate(`/deals/${deal.id}`) }}
              >
                <Tooltip direction="top" offset={[0, -8]}>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-medium">{deal.name}</p>
                    <p className="text-xs text-muted-foreground">{deal.city}</p>
                    <StageBadge stage={deal.stage} />
                    <p className="text-xs">{formatCurrency(deal.amountTarget)}</p>
                  </div>
                </Tooltip>
              </Marker>
            ))}
          {showEntities &&
            geoEntities.map((entity) => (
              <Marker key={entity.id} position={[Number(entity.lat), Number(entity.lng)]} icon={entityIcon}>
                <Tooltip direction="top" offset={[0, -6]}>
                  <div className="flex flex-col gap-1 text-sm">
                    <p className="font-medium">{entity.name}</p>
                    <p className="text-xs text-muted-foreground">{GRAPH_ENTITY_TYPE_LABELS[entity.type]}</p>
                    {entity.city && <p className="text-xs text-muted-foreground">{entity.city}</p>}
                  </div>
                </Tooltip>
              </Marker>
            ))}
        </MapContainer>
      </div>
    </div>
  );
}
