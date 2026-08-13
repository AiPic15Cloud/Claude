import { Search, SlidersHorizontal, AlertTriangle, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { DEAL_STAGES, DEAL_STAGE_LABELS, DEAL_TYPE_LABELS, DEAL_TYPES, type DealStage, type DealType } from '@/types';
import { useTags } from '../hooks/use-tags';
import { TagBadge } from './tag-badge';
import type { DealsFilters } from '../hooks/use-deals';

interface FiltersBarProps {
  filters: DealsFilters;
  onChange: (filters: DealsFilters) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  const { data: tags = [] } = useTags();

  const toggleStage = (stage: DealStage) => {
    const current = filters.stage ?? [];
    onChange({ ...filters, stage: current.includes(stage) ? current.filter((s) => s !== stage) : [...current, stage] });
  };

  const toggleType = (type: DealType) => {
    const current = filters.type ?? [];
    onChange({ ...filters, type: current.includes(type) ? current.filter((t) => t !== type) : [...current, type] });
  };

  const toggleTag = (tagId: string) => {
    const current = filters.tagIds ?? [];
    onChange({ ...filters, tagIds: current.includes(tagId) ? current.filter((t) => t !== tagId) : [...current, tagId] });
  };

  const activeFilterCount = (filters.stage?.length ?? 0) + (filters.type?.length ?? 0) + (filters.tagIds?.length ?? 0);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative w-full max-w-xs">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une opération…"
            className="pl-8"
            value={filters.search ?? ''}
            onChange={(e) => onChange({ ...filters, search: e.target.value })}
          />
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Étape {filters.stage?.length ? `(${filters.stage.length})` : ''}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filtrer par étape</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEAL_STAGES.map((stage) => (
              <DropdownMenuCheckboxItem
                key={stage}
                checked={filters.stage?.includes(stage) ?? false}
                onCheckedChange={() => toggleStage(stage)}
                onSelect={(e) => e.preventDefault()}
              >
                {DEAL_STAGE_LABELS[stage]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              Type {filters.type?.length ? `(${filters.type.length})` : ''}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filtrer par type</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {DEAL_TYPES.map((type) => (
              <DropdownMenuCheckboxItem
                key={type}
                checked={filters.type?.includes(type) ?? false}
                onCheckedChange={() => toggleType(type)}
                onSelect={(e) => e.preventDefault()}
              >
                {DEAL_TYPE_LABELS[type]}
              </DropdownMenuCheckboxItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Tags {filters.tagIds?.length ? `(${filters.tagIds.length})` : ''}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-48">
            <DropdownMenuLabel>Filtrer par tag</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {tags.map((tag) => (
              <DropdownMenuCheckboxItem
                key={tag.id}
                checked={filters.tagIds?.includes(tag.id) ?? false}
                onCheckedChange={() => toggleTag(tag.id)}
                onSelect={(e) => e.preventDefault()}
              >
                <TagBadge tag={tag} />
              </DropdownMenuCheckboxItem>
            ))}
            {tags.length === 0 && <p className="px-2 py-1.5 text-xs text-muted-foreground">Aucun tag</p>}
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant={filters.late ? 'destructive' : 'outline'}
          size="sm"
          onClick={() => onChange({ ...filters, late: !filters.late })}
        >
          <AlertTriangle className="h-3.5 w-3.5" />
          En retard
        </Button>

        {(activeFilterCount > 0 || filters.late) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onChange({ ...filters, stage: [], type: [], tagIds: [], late: false })}
          >
            <X className="h-3.5 w-3.5" />
            Réinitialiser
          </Button>
        )}
      </div>

      {activeFilterCount > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {filters.stage?.map((stage) => (
            <Badge key={stage} variant="secondary" className="cursor-pointer" onClick={() => toggleStage(stage)}>
              {DEAL_STAGE_LABELS[stage]} <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
          {filters.type?.map((type) => (
            <Badge key={type} variant="secondary" className="cursor-pointer" onClick={() => toggleType(type)}>
              {DEAL_TYPE_LABELS[type]} <X className="ml-1 h-3 w-3" />
            </Badge>
          ))}
        </div>
      )}
    </div>
  );
}
