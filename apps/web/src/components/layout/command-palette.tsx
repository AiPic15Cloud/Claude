import { useEffect, useState } from 'react';
import { Command } from 'cmdk';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Building2, Network, Newspaper, Search, LogOut, Moon, Sun } from 'lucide-react';
import { useUiStore } from '@/store/ui.store';
import { useThemeStore } from '@/store/theme.store';
import { NAV_ITEMS } from './nav-items';
import { api } from '@/lib/api';
import type { Deal, PaginatedResult } from '@/types';
import { useLogout } from '@/features/auth/use-auth';
import { cn } from '@/lib/utils';

interface UnifiedSearchResult {
  deals: { id: string; name: string; reference: string }[];
  entities: { id: string; name: string; type: string }[];
  articles: { id: string; title: string; category: string }[];
  degraded: boolean;
}

export function CommandPalette() {
  const { commandPaletteOpen, setCommandPaletteOpen } = useUiStore();
  const [search, setSearch] = useState('');
  const navigate = useNavigate();
  const { theme, setTheme } = useThemeStore();
  const logout = useLogout();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setCommandPaletteOpen(!commandPaletteOpen);
      }
      if (e.key === 'Escape') setCommandPaletteOpen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [commandPaletteOpen, setCommandPaletteOpen]);

  useEffect(() => {
    if (!commandPaletteOpen) setSearch('');
  }, [commandPaletteOpen]);

  const { data: dealResults } = useQuery({
    queryKey: ['command-search-deals', search],
    queryFn: () => api.get<PaginatedResult<Deal>>(`/deals?search=${encodeURIComponent(search)}&pageSize=6`),
    enabled: commandPaletteOpen && search.trim().length >= 2,
  });

  const { data: unified } = useQuery({
    queryKey: ['command-search-unified', search],
    queryFn: () => api.get<UnifiedSearchResult>(`/search?q=${encodeURIComponent(search)}`),
    enabled: commandPaletteOpen && search.trim().length >= 2,
  });

  const go = (path: string) => {
    navigate(path);
    setCommandPaletteOpen(false);
  };

  if (!commandPaletteOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[1100] flex items-start justify-center bg-background/70 pt-[15vh] backdrop-blur-sm"
      onClick={() => setCommandPaletteOpen(false)}
    >
      <div
        className="w-full max-w-lg overflow-hidden rounded-lg border border-border bg-popover shadow-2xl animate-in fade-in-0 zoom-in-95"
        onClick={(e) => e.stopPropagation()}
      >
        <Command shouldFilter={false} className="flex flex-col">
          <div className="flex items-center gap-2 border-b border-border px-3">
            <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
            <Command.Input
              autoFocus
              value={search}
              onValueChange={setSearch}
              placeholder="Rechercher une page, une opération…"
              className="flex h-11 w-full bg-transparent text-base outline-none placeholder:text-muted-foreground md:text-sm"
            />
          </div>
          <Command.List className="max-h-96 overflow-y-auto p-2">
            <Command.Empty className="py-6 text-center text-sm text-muted-foreground">Aucun résultat</Command.Empty>

            <Command.Group heading="Navigation" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              {NAV_ITEMS.filter((i) => i.available).map((item) => {
                const Icon = item.icon;
                return (
                  <Command.Item
                    key={item.path}
                    onSelect={() => go(item.path)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <Icon className="h-4 w-4 text-muted-foreground" />
                    {item.label}
                  </Command.Item>
                );
              })}
            </Command.Group>

            {dealResults && dealResults.items.length > 0 && (
              <Command.Group heading="Opérations" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {dealResults.items.map((deal) => (
                  <Command.Item
                    key={deal.id}
                    onSelect={() => go(`/deals/${deal.id}`)}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{deal.name}</span>
                    <span className="text-xs text-muted-foreground">{deal.reference}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {unified && unified.entities.length > 0 && (
              <Command.Group heading="Intervenants & plateformes" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {unified.entities.map((entity) => (
                  <Command.Item
                    key={entity.id}
                    onSelect={() => go(entity.type === 'PLATEFORME' ? '/competitors' : '/graph')}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <Network className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{entity.name}</span>
                    <span className="text-xs text-muted-foreground">{entity.type}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            {unified && unified.articles.length > 0 && (
              <Command.Group heading="Actualités" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                {unified.articles.map((article) => (
                  <Command.Item
                    key={article.id}
                    onSelect={() => go('/market')}
                    className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
                  >
                    <Newspaper className="h-4 w-4 text-muted-foreground" />
                    <span className="flex-1 truncate">{article.title}</span>
                  </Command.Item>
                ))}
              </Command.Group>
            )}

            <Command.Group heading="Actions" className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
              <Command.Item
                onSelect={() => {
                  setTheme(theme === 'dark' ? 'light' : 'dark');
                  setCommandPaletteOpen(false);
                }}
                className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-foreground data-[selected=true]:bg-accent"
              >
                {theme === 'dark' ? <Sun className="h-4 w-4 text-muted-foreground" /> : <Moon className="h-4 w-4 text-muted-foreground" />}
                Changer de thème
              </Command.Item>
              <Command.Item
                onSelect={() => {
                  setCommandPaletteOpen(false);
                  logout();
                }}
                className={cn(
                  'flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-2 text-sm text-destructive data-[selected=true]:bg-accent',
                )}
              >
                <LogOut className="h-4 w-4" />
                Se déconnecter
              </Command.Item>
            </Command.Group>
          </Command.List>
        </Command>
      </div>
    </div>
  );
}

