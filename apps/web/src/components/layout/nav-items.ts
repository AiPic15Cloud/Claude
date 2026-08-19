import {
  LayoutDashboard,
  Briefcase,
  GitBranch,
  Target,
  Wallet,
  Globe2,
  Radar,
  Map as MapIcon,
  Bot,
  BookUser,
  Network,
  type LucideIcon,
} from 'lucide-react';

export interface NavItem {
  label: string;
  path: string;
  icon: LucideIcon;
}

export const NAV_ITEMS: NavItem[] = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
  { label: 'Objectifs', path: '/objectifs', icon: Target },
  { label: 'Remboursements', path: '/remboursements', icon: Wallet },
  { label: 'Répertoire', path: '/repertoire', icon: BookUser },
  { label: 'Marché', path: '/market', icon: Globe2 },
  { label: 'Intelligence Concurrentielle', path: '/competitors', icon: Radar },
  { label: 'Cartographie', path: '/map', icon: MapIcon },
  { label: 'Knowledge Graph', path: '/graph', icon: Network },
  { label: 'Agents IA', path: '/ai', icon: Bot },
];
