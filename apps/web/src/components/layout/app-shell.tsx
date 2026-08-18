import { Outlet, useLocation } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Sidebar } from './sidebar';
import { Topbar } from './topbar';
import { MobileTabBar } from './mobile-tab-bar';
import { CommandPalette } from './command-palette';
import { useUiStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

export function AppShell() {
  const sidebarCollapsed = useUiStore((s) => s.sidebarCollapsed);
  const location = useLocation();

  return (
    <div className="relative min-h-screen">
      <div className="fixed inset-0 -z-10 bg-background" />

      <div className="print:hidden">
        <Sidebar />
      </div>
      <div className={cn('flex min-h-screen flex-col transition-[margin] duration-200', sidebarCollapsed ? 'md:ml-16' : 'md:ml-60', 'print:ml-0')}>
        <div className="print:hidden">
          <Topbar />
        </div>
        <main className="flex-1 px-5 pb-24 pt-6 md:px-8 md:py-8 lg:px-10 print:p-0">
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
            >
              <Outlet />
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
      <div className="print:hidden">
        <MobileTabBar />
      </div>
      <CommandPalette />
    </div>
  );
}
