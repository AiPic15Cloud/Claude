import { useEffect, useRef, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import type { DealsFilters } from '../hooks/use-deals';

interface DealSearchFieldProps {
  filters: DealsFilters;
  onChange: (filters: DealsFilters) => void;
  className?: string;
  inputClassName?: string;
  placeholder?: string;
}

// Extrait de FiltersBar : le debounce (300ms) évite un refetch /deals à chaque
// frappe. Partagé entre la barre de filtres desktop et la recherche mobile
// (portfolio-page.tsx), qui n'a besoin que de ce champ, pas des dropdowns.
export function DealSearchField({ filters, onChange, className, inputClassName, placeholder }: DealSearchFieldProps) {
  const [searchInput, setSearchInput] = useState(filters.search ?? '');
  const filtersRef = useRef(filters);
  const onChangeRef = useRef(onChange);
  filtersRef.current = filters;
  onChangeRef.current = onChange;

  useEffect(() => {
    setSearchInput(filters.search ?? '');
  }, [filters.search]);

  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchInput !== (filtersRef.current.search ?? '')) {
        onChangeRef.current({ ...filtersRef.current, search: searchInput });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchInput]);

  return (
    <div className={cn('relative', className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder={placeholder ?? 'Rechercher une opération…'}
        className={cn('pl-9', inputClassName)}
        value={searchInput}
        onChange={(e) => setSearchInput(e.target.value)}
      />
    </div>
  );
}
