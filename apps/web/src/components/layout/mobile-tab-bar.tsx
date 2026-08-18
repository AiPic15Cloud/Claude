import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, GitBranch, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';

// Une couleur dédiée par onglet (repris de la palette de graphiques déjà
// utilisée ailleurs dans l'app) plutôt qu'un simple blanc/gris uniforme —
// chaque bouton se reconnaît à sa couleur, façon Réglages iOS.
const TABS = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard, color: 'text-chart-accent' },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase, color: 'text-chart-2' },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch, color: 'text-chart-3' },
];
const PLUS_COLOR = 'text-chart-4';

const itemClass = (active: boolean, color: string) =>
  cn(
    'flex flex-1 flex-col items-center gap-1 py-1 text-[11px] transition-colors',
    active ? cn(color, 'font-semibold') : 'text-muted-foreground/70 font-medium',
  );

// Primary mobile navigation — the other ~8 modules stay one tap away behind
// "Plus", which opens the same drawer the topbar hamburger used to trigger
// (now removed there, this is the single mobile nav entry point). Floating
// pill bar (margin on all sides, fully rounded) rather than an edge-to-edge
// bar, per reference (Prime Video's tab bar) — each tab carries its own
// accent color when active instead of a uniform highlight.
export function MobileTabBar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <nav className="fixed inset-x-4 bottom-[max(1rem,env(safe-area-inset-bottom))] z-30 mx-auto flex max-w-md items-stretch justify-around gap-1 rounded-full border border-border bg-card/85 px-2 py-2 shadow-2xl backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink key={tab.path} to={tab.path} className="flex-1">
            {({ isActive }) => (
              <span className={itemClass(isActive, tab.color)}>
                <Icon className="h-5 w-5" />
                {tab.label}
              </span>
            )}
          </NavLink>
        );
      })}
      <button onClick={() => setMobileNavOpen(true)} className="flex-1">
        <span className={itemClass(mobileNavOpen, PLUS_COLOR)}>
          <Menu className="h-5 w-5" />
          Plus
        </span>
      </button>
    </nav>
  );
}
