import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, GitBranch, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';

const TABS = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
];

// Icône dans une pilule pleine quand l'onglet est actif (même logique que
// TabsList/TabsTrigger — piste neutre, segment actif détaché du fond) plutôt
// qu'un simple changement de couleur de texte, pour que l'onglet courant se
// distingue d'un coup d'œil.
function TabPill({ active, children }: { active: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        'flex h-8 w-12 items-center justify-center rounded-full transition-colors',
        active ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/30' : 'text-muted-foreground',
      )}
    >
      {children}
    </span>
  );
}

// Primary mobile navigation — the other ~8 modules stay one tap away behind
// "Plus", which opens the same drawer the topbar hamburger used to trigger
// (now removed there, this is the single mobile nav entry point).
export function MobileTabBar() {
  const mobileNavOpen = useUiStore((s) => s.mobileNavOpen);
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around gap-1 rounded-t-3xl border-t border-border bg-card/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-xl md:hidden">
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className="flex flex-1 flex-col items-center gap-1 py-1 text-xs"
          >
            {({ isActive }) => (
              <>
                <TabPill active={isActive}>
                  <Icon className="h-5 w-5" />
                </TabPill>
                <span className={cn('font-medium', isActive ? 'text-primary' : 'text-muted-foreground')}>{tab.label}</span>
              </>
            )}
          </NavLink>
        );
      })}
      <button onClick={() => setMobileNavOpen(true)} className="flex flex-1 flex-col items-center gap-1 py-1 text-xs">
        <TabPill active={mobileNavOpen}>
          <Menu className="h-5 w-5" />
        </TabPill>
        <span className={cn('font-medium', mobileNavOpen ? 'text-primary' : 'text-muted-foreground')}>Plus</span>
      </button>
    </nav>
  );
}
