import { Outlet } from 'react-router-dom';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { CommandPalette } from './command-palette';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className={cn('flex min-h-screen flex-col transition-[margin] duration-200', sidebarCollapsed ? 'ml-16' : 'ml-60')}>
        <Topbar />
        <main className="flex-1 px-6 py-6">
          <Outlet />
        </main>
      </div>
      <CommandPalette />
    </div>
  );
}
