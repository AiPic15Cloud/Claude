import { Info } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import type { RealizedPerformance } from '@/types';

/**
 * Détail du TRI/multiple réalisés (spec complémentaire D.4) — même doctrine
 * que CrdDetailPopover : jamais un chiffre opaque, un Popover au clic pour
 * rester consultable sur poste tactile. TRI/multiple mesurent une
 * performance d'investissement (capital investi → capital rendu), distincte
 * du CRD qui mesure une exposition résiduelle.
 */
export function RealizedPerformancePopover({ performance }: { performance: RealizedPerformance }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex shrink-0 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-foreground"
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">Détail de la performance réalisée</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-72" align="start">
        <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">Performance réalisée</p>
        <div className="flex flex-col gap-1.5 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Multiple de capital</span>
            <span className="font-medium tabular-nums">{performance.multipleCapital !== null ? `${performance.multipleCapital.toFixed(2)}x` : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Durée réelle de détention</span>
            <span className="font-medium tabular-nums">{performance.dureeReelleDetentionMois !== null ? `${performance.dureeReelleDetentionMois} mois` : '—'}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Taux contractuel</span>
            <span className="font-medium tabular-nums">{performance.tauxContractuelPct !== null ? `${performance.tauxContractuelPct}%` : '—'}</span>
          </div>
          <div className="flex items-center justify-between border-t border-border pt-1.5">
            <span className="font-medium text-foreground">Écart TRI vs taux contractuel</span>
            <span className="font-semibold tabular-nums">
              {performance.ecartTriVsContractuelPts !== null
                ? `${performance.ecartTriVsContractuelPts > 0 ? '+' : ''}${performance.ecartTriVsContractuelPts} pts`
                : '—'}
            </span>
          </div>
        </div>
        <p className="mt-3 text-[11px] leading-snug text-muted-foreground">
          TRI (XIRR) et multiple calculés sur les remboursements réalisés à date (jamais les projetés). Sur un dossier
          encore actif, il s'agit d'un TRI réalisé à date, pas d'un TRI final — l'écart avec le taux contractuel
          révèle l'impact des retards, remboursements anticipés ou dégradations.
        </p>
      </PopoverContent>
    </Popover>
  );
}
