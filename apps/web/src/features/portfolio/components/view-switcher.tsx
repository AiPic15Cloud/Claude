import { Kanban, List, Map as MapIcon, Table2 } from 'lucide-react';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

export type PortfolioView = 'kanban' | 'list' | 'table' | 'map';

const VIEWS: { value: PortfolioView; label: string; icon: typeof Kanban }[] = [
  { value: 'kanban', label: 'Kanban', icon: Kanban },
  { value: 'list', label: 'Liste', icon: List },
  { value: 'table', label: 'Tableau', icon: Table2 },
  { value: 'map', label: 'Carte', icon: MapIcon },
];

interface ViewSwitcherProps {
  value: PortfolioView;
  onChange: (view: PortfolioView) => void;
}

export function ViewSwitcher({ value, onChange }: ViewSwitcherProps) {
  return (
    <Tabs value={value} onValueChange={(v) => onChange(v as PortfolioView)}>
      <TabsList>
        {VIEWS.map((view) => {
          const Icon = view.icon;
          return (
            <TabsTrigger key={view.value} value={view.value} className="gap-1.5">
              <Icon className="h-3.5 w-3.5" />
              {view.label}
            </TabsTrigger>
          );
        })}
      </TabsList>
    </Tabs>
  );
}
