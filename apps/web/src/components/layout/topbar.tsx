import { Link } from 'react-router-dom';
import { Search, LogOut, User as UserIcon, Bot } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { ThemeToggle } from '@/components/common/theme-toggle';
import { NotificationsMenu } from './notifications-menu';
import { MarketTicker } from './market-ticker';
import { useUiStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { useLogout } from '@/features/auth/use-auth';

function initials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase();
}

export function Topbar() {
  const setCommandPaletteOpen = useUiStore((s) => s.setCommandPaletteOpen);
  const user = useAuthStore((s) => s.user);
  const logout = useLogout();
  const isMac = typeof navigator !== 'undefined' && navigator.platform.toLowerCase().includes('mac');

  return (
    <div className="sticky top-0 z-20 flex flex-col border-b border-border bg-background/80 backdrop-blur">
      <MarketTicker />
      <header className="flex h-14 items-center gap-3 px-5">
        <button
          onClick={() => setCommandPaletteOpen(true)}
          className="flex h-8 w-full max-w-sm items-center gap-2 rounded-md border border-input bg-secondary/60 px-3 text-sm text-muted-foreground transition-colors hover:bg-secondary"
        >
          <Search className="h-3.5 w-3.5" />
          <span className="flex-1 text-left">Rechercher…</span>
          <kbd className="rounded border border-border bg-background px-1.5 py-0.5 text-[10px] font-medium">
            {isMac ? '⌘' : 'Ctrl'} K
          </kbd>
        </button>

        <div className="ml-auto flex items-center gap-1">
          <Link
            to="/ai"
            className="mr-1 flex h-8 items-center gap-1.5 rounded-md border border-input bg-secondary/60 px-3 text-xs font-medium text-foreground transition-colors hover:bg-secondary"
          >
            <Bot className="h-3.5 w-3.5" />
            Agents IA
          </Link>
          <NotificationsMenu />
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="ml-1 flex items-center gap-2 rounded-md p-1 hover:bg-accent">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="text-[11px]">{initials(user?.firstName, user?.lastName)}</AvatarFallback>
                </Avatar>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <p className="text-sm font-medium">
                  {user?.firstName} {user?.lastName}
                </p>
                <p className="text-xs font-normal text-muted-foreground">{user?.email}</p>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem disabled>
                <UserIcon /> Profil
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={logout} className="text-destructive focus:text-destructive">
                <LogOut /> Se déconnecter
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </div>
  );
}
