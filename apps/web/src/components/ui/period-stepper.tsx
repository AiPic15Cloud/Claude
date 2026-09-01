import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface PeriodStepperProps {
  label: string | number;
  onPrev: () => void;
  onNext: () => void;
  nextDisabled?: boolean;
  size?: 'default' | 'sm';
  className?: string;
}

/** Pill-shaped prev/label/next control — same rounded-track recipe as `Tabs`
 * (`rounded-lg bg-muted p-1`, active segment `rounded-md bg-background
 * shadow-sm`), just applied to a single stepping value (e.g. a year)
 * instead of a multi-way selection. */
export function PeriodStepper({ label, onPrev, onNext, nextDisabled, size = 'default', className }: PeriodStepperProps) {
  const compact = size === 'sm';
  return (
    <div
      className={cn(
        'inline-flex items-center gap-1 rounded-lg bg-muted p-1 text-muted-foreground',
        compact ? 'h-7' : 'h-9',
        className,
      )}
    >
      <button
        type="button"
        onClick={onPrev}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md transition-colors hover:bg-background hover:text-foreground',
          compact ? 'h-5 w-5' : 'h-7 w-7',
        )}
      >
        <ChevronLeft className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
      <span
        className={cn(
          'inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-md bg-background font-medium tabular-nums text-foreground shadow-sm',
          compact ? 'h-5 min-w-[2.75rem] px-1.5 text-xs' : 'h-7 min-w-[3.5rem] px-2 text-sm',
        )}
      >
        {label}
      </span>
      <button
        type="button"
        onClick={onNext}
        disabled={nextDisabled}
        className={cn(
          'inline-flex shrink-0 items-center justify-center rounded-md transition-colors hover:bg-background hover:text-foreground disabled:pointer-events-none disabled:opacity-40',
          compact ? 'h-5 w-5' : 'h-7 w-7',
        )}
      >
        <ChevronRight className={compact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
      </button>
    </div>
  );
}
