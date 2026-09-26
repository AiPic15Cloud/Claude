import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, GitBranch, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';

const TABS = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
];

const itemClass = (active: boolean) =>
  cn(
    // Un seul accent (l'or du rail) plutôt qu'une couleur par onglet — même
    // doctrine que le reste du système : la couleur signale l'état, jamais
    // la simple identité d'un élément.
    'flex flex-1 flex-col items-center gap-1 py-1 text-[11px] transition-colors',
    active ? 'text-sidebar-accent font-semibold' : 'text-sidebar-foreground/60 font-medium',
  );

// Primary mobile navigation — the other ~8 modules stay one tap away behind
// "Plus", which opens the same drawer the topbar hamburger used to trigger
// (now removed there, this is the single mobile nav entry point). Barre
// sombre fixe, hors bascule clair/sombre — même rail que sidebar.tsx,
// simplement couché à l'horizontale pour l'écran mobile.
export function MobileTabBar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around border-t border-sidebar-border bg-sidebar px-2 py-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] md:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink key={tab.path} to={tab.path} className="flex-1">
            {({ isActive }) => (
              <span className={itemClass(isActive)}>
                <Icon className="h-5 w-5" />
                {tab.label}
              </span>
            )}
          </NavLink>
        );
      })}
      <button onClick={() => setMobileNavOpen(true)} className="flex-1">
        <span className={itemClass(mobileNavOpen)}>
          <Menu className="h-5 w-5" />
          Plus
        </span>
      </button>
    </nav>
  );
}
