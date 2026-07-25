import {
  LayoutDashboard,
  FolderKanban,
  Briefcase,
  Globe2,
  Radar,
  Network,
  Map as MapIcon,
  Bot,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
  /** Modules not yet built in this delivery phase are shown but marked as roadmap. */
  available: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard, available: true },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase, available: true },
  { label: 'Dossiers', path: '/deals', icon: FolderKanban, available: false },
  { label: 'Intelligence Marché', path: '/market', icon: Globe2, available: false },
  { label: 'Intelligence Concurrentielle', path: '/competitors', icon: Radar, available: false },
  { label: 'Knowledge Graph', path: '/graph', icon: Network, available: false },
  { label: 'Cartographie', path: '/map', icon: MapIcon, available: false },
  { label: 'Agents IA', path: '/ai', icon: Bot, available: false },
];
