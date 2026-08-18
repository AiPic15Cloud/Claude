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
  cn('flex flex-1 flex-col items-center gap-1 py-1 text-[11px] transition-colors', active ? 'text-foreground font-semibold' : 'text-muted-foreground/70 font-medium');

// Primary mobile navigation — the other ~8 modules stay one tap away behind
// "Plus", which opens the same drawer the topbar hamburger used to trigger
// (now removed there, this is the single mobile nav entry point). Floating
// pill bar (margin on all sides, fully rounded) rather than an edge-to-edge
// bar — active tab reads via brightness/weight, not a colored badge behind
// the icon, per reference (Prime Video's tab bar).
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
