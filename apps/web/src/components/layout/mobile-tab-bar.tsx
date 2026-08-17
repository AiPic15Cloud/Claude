import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Briefcase, GitBranch, Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUiStore } from '@/store/ui.store';

const TABS = [
  { label: 'Cockpit', path: '/cockpit', icon: LayoutDashboard },
  { label: 'Portefeuille', path: '/portfolio', icon: Briefcase },
  { label: 'Pipeline', path: '/pipeline', icon: GitBranch },
];

// Primary mobile navigation — the other ~8 modules stay one tap away behind
// "Plus", which opens the same drawer the topbar hamburger used to trigger
// (now removed there, this is the single mobile nav entry point).
export function MobileTabBar() {
  const setMobileNavOpen = useUiStore((s) => s.setMobileNavOpen);

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex items-stretch justify-around gap-1 overflow-hidden rounded-t-3xl border-t border-white/30 bg-card/85 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-2xl backdrop-blur-xl before:absolute before:inset-0 before:-z-10 before:rounded-[inherit] before:bg-gradient-to-b before:from-white/20 before:to-transparent before:opacity-70 before:content-[''] md:hidden dark:border-white/10 dark:before:from-white/5"
    >
      {TABS.map((tab) => {
        const Icon = tab.icon;
        return (
          <NavLink
            key={tab.path}
            to={tab.path}
            className={({ isActive }) =>
              cn(
                'flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium transition-colors',
                isActive ? 'text-primary' : 'text-muted-foreground',
              )
            }
          >
            <Icon className="h-5 w-5" />
            {tab.label}
          </NavLink>
        );
      })}
      <button
        onClick={() => setMobileNavOpen(true)}
        className="flex flex-1 flex-col items-center gap-1 rounded-2xl py-1.5 text-[11px] font-medium text-muted-foreground transition-colors"
      >
        <Menu className="h-5 w-5" />
        Plus
      </button>
    </nav>
  );
}
