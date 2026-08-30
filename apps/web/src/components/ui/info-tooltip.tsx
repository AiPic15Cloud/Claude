import { Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip';

/** Petit "i" d'aide pour expliquer un terme technique (EWS, LTC, RAS…) au survol/focus, sans alourdir le libellé lui-même. */
export function InfoTooltip({ text, className }: { text: string; className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => e.preventDefault()}
          className={cn('inline-flex shrink-0 text-muted-foreground/60 outline-none transition-colors hover:text-foreground focus-visible:text-foreground', className)}
        >
          <Info className="h-3.5 w-3.5" />
          <span className="sr-only">En savoir plus</span>
        </button>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 rounded-lg text-left leading-snug">{text}</TooltipContent>
    </Tooltip>
  );
}
