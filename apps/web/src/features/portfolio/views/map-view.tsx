import { useMemo } from 'react';
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { StageBadge } from '../components/deal-badges';
import { formatCurrency } from '@/lib/format';
import type { Deal, DealSurveillanceStatus } from '@/types';
import { useThemeStore } from '@/store/theme.store';

interface MapViewProps {
  deals: Deal[];
  onSelectDeal: (id: string) => void;
}

const FRANCE_CENTER: [number, number] = [46.6, 2.4];

// Leaflet marker HTML is inserted into the live DOM, so var(--x) resolves
// against the current theme just like any other CSS — no hardcoded hex,
// no manual dark-mode branching.
function surveillanceColor(status?: DealSurveillanceStatus | null): string {
  if (!status) return 'hsl(var(--muted-foreground))';
  if (status === 'FAIBLE') return 'hsl(var(--success))';
  if (status === 'SOUS_SURVEILLANCE' || status === 'ELEVE') return 'hsl(var(--warning))';
  return 'hsl(var(--destructive))';
}

function buildIcon(status?: DealSurveillanceStatus | null) {
  const color = surveillanceColor(status);
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
            icon={buildIcon(deal.surveillanceStatus)}
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
