import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  Target,
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
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch, available: true },
  { label: 'Objectifs', path: '/objectifs', icon: Target, available: true },
  { label: 'Intelligence Marché', path: '/market', icon: Globe2, available: true },
  { label: 'Intelligence Concurrentielle', path: '/competitors', icon: Radar, available: true },
  { label: 'Knowledge Graph', path: '/graph', icon: Network, available: true },
  { label: 'Cartographie', path: '/map', icon: MapIcon, available: true },
  { label: 'Agents IA', path: '/ai', icon: Bot, available: true },
];
