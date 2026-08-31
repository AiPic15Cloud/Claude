import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { formatCurrency } from '@/lib/format';

interface CrdDetailPopoverProps {
  crdCapital: number;
  crdInteretsCourus: number | null | undefined;
  crdTotal: number | null | undefined;
}

/**
 * Détail du CRD au clic (spec ATLAS v2, A.3ter) — jamais un chiffre opaque,
 * même affiché comme une valeur unique par défaut sur la carte. Un Popover
 * (ouvert au clic) plutôt qu'un tooltip au survol, pour rester consultable
 * sur un poste tactile et laisser le temps de lire la décomposition.
 */
export function CrdDetailPopover({ crdCapital, crdInteretsCourus, crdTotal }: CrdDetailPopoverProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Détail du capital restant dû</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Décomposition du CRD</p>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Capital restant dû</span>
            <span className="font-medium tabular-nums">{formatCurrency(crdCapital)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Intérêts courus</span>
            <span className="font-medium tabular-nums">
              {crdInteretsCourus != null ? formatCurrency(crdInteretsCourus) : 'Non calculables'}
            </span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5">
            <span className="font-medium text-foreground">Total</span>
            <span className="font-semibold tabular-nums">
              {formatCurrency(crdTotal ?? crdCapital)}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          Intérêts calculés au prorata simple (taux annuel × jours écoulés / 365) sur le capital restant dû, imputés
          en priorité sur chaque remboursement réalisé avant le capital — ordre légal par défaut à défaut de tableau
          d'amortissement contractuel (art. 1342-10 du Code civil). Les remboursements projetés ne sont jamais
          déduits.
        </p>
      </PopoverContent>
    </Popover>
  );
}
