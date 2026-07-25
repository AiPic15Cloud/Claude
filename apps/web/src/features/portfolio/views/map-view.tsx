import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StageBadge } from '../components/deal-badges';
import { formatCurrency } from '@/lib/format';
import type { Deal } from '@/types';
import { useThemeStore } from '@/store/theme.store';

interface MapViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
}

const FRANCE_CENTER: [number, number] = [46.6, 2.4];

function scoreColor(score?: number | null): string {
  if (score === null || score === undefined) return '#6b7280';
  if (score >= 70) return '#16a34a';
  if (score >= 40) return '#f59e0b';
  return '#dc2626';
}

function buildIcon(score?: number | null) {
  const color = scoreColor(score);
  return L.divIcon({
    html: `<div style="width:14px;height:14px;border-radius:9999px;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,.4)"></div>`,
    className: '',
    iconSize: [14, 14],
    iconAnchor: [7, 7],
  });
}

export function MapView({ deals, onSelectDeal }: MapViewProps) {
  const theme = useThemeStore((s) => s.theme);
  const geoDeals = useMemo(() => deals.filter((d) => d.lat && d.lng), [deals]);

  const tileUrl =
    theme === 'dark'
      ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
      : 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png';

  return (
    <div className="h-[calc(100vh-15rem)] overflow-hidden rounded-lg border border-border">
      <MapContainer center={FRANCE_CENTER} zoom={6} className="h-full w-full" scrollWheelZoom>
        <TileLayer
          attribution='&copy; <a href="https://carto.com/attributions">CARTO</a> &copy; OpenStreetMap contributors'
          url={tileUrl}
        />
        {geoDeals.map((deal) => (
          <Marker
            key={deal.id}
            position={[Number(deal.lat), Number(deal.lng)]}
            icon={buildIcon(deal.atlasScore)}
            eventHandlers={{ click: () => onSelectDeal(deal.id) }}
          >
            <Popup>
              <div className="flex flex-col gap-1 text-sm">
                <p className="font-medium">{deal.name}</p>
                <p className="text-xs text-muted-foreground">{deal.city}</p>
                <StageBadge stage={deal.stage} />
                <p className="text-xs">{formatCurrency(deal.amountTarget)}</p>
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      {geoDeals.length === 0 && (
        <p className="py-16 text-center text-sm text-muted-foreground">Aucune opération géolocalisée pour ces filtres.</p>
      )}
    </div>
  );
}
