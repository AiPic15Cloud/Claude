import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette } from './command-palette';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="relative min-h-screen">
      {/* Ambient background glow — fixed to the viewport (never affects
          document width) and clipped by overflow-hidden so the blurred
          blobs can't bleed past it. Sits behind every page's cards, which
          have their own opaque bg-card, so this only shows in the gaps. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
        <div className="absolute -left-20 -top-32 h-[480px] w-[480px] rounded-full bg-primary/30 blur-[100px]" />
        <div className="absolute -right-20 -top-24 h-[440px] w-[440px] rounded-full bg-violet-500/25 blur-[100px]" />
        <div className="absolute -bottom-40 left-1/3 h-[500px] w-[500px] rounded-full bg-primary/15 blur-[120px]" />
      </div>

      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-[margin] duration-200', sidebarCollapsed ? 'md:ml-16' : 'md:ml-60')}>
        <Topbar />
        <main className="flex-1 px-4 py-4 md:px-6 md:py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
