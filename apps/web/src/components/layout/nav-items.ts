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
  Radio,
  KanbanSquare,
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
  { label: 'Tâches', path: '/tasks', icon: KanbanSquare },
  { label: 'Répertoire', path: '/repertoire', icon: BookUser },
  { label: 'Marché', path: '/market', icon: Globe2 },
  { label: 'Intelligence Concurrentielle', path: '/competitors', icon: Radar },
  { label: 'Observations marché', path: '/market-observations', icon: Radio },
  { label: 'Cartographie', path: '/map', icon: MapIcon },
  { label: 'Knowledge Graph', path: '/graph', icon: Network },
  { label: 'Agents IA', path: '/ai', icon: Bot },
];
