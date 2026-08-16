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
      <div className="fixed inset-0 -z-10 bg-background" />

      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-[margin] duration-200', sidebarCollapsed ? 'md:ml-16' : 'md:ml-60')}>
        <Topbar />
        <main className="flex-1 px-5 py-6 md:px-8 md:py-8 lg:px-10">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
