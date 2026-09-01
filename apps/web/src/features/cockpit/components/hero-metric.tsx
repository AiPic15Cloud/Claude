import { Link } from 'react-router-dom';
import { cn } from '@/lib/utils';

interface SecondaryStat {
  label: string;
  value: string;
  href?: string;
  tone?: 'default' | 'down';
}

interface HeroMetricProps {
  label: string;
  value: string;
  context?: string;
  stats: SecondaryStat[];
}

// The Cockpit's one dominant number, replacing the old row of equally-
// weighted gradient tiles — a single confident figure (Spectral, light
// weight, huge scale) with everything else reduced to quiet text rows
// beside it. Matches the "Cockpit Premium" concept: restraint spent on
// one number, not spread across four boxes.
export function HeroMetric({ label, value, context, stats }: HeroMetricProps) {
  return (
    <div className="grid grid-cols-1 gap-8 lg:grid-cols-[1.4fr_1fr] lg:items-end lg:gap-16">
      <div>
        <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="mt-2 font-display text-6xl font-light tracking-tight tabular-nums sm:text-7xl lg:text-8xl">{value}</p>
        {context && (
          <p className="mt-3 flex items-center gap-2.5 text-sm text-muted-foreground">
            <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-brand-accent shadow-[0_0_0_4px_hsl(var(--brand-accent)/0.18)]" />
            {context}
          </p>
        )}
      </div>
      <div className="flex flex-col">
        {stats.map((stat) => {
          const row = (
            <div className="flex items-baseline justify-between gap-4 border-t border-border py-4 first:pt-0 last:pb-0">
              <span className="text-sm text-muted-foreground">{stat.label}</span>
              <span
                className={cn(
                  'font-mono text-lg tabular-nums',
                  stat.tone === 'down' ? 'text-destructive' : 'text-foreground',
                )}
              >
                {stat.value}
              </span>
            </div>
          );
          return stat.href ? (
            <Link key={stat.label} to={stat.href} className="transition-colors hover:text-foreground">
              {row}
            </Link>
          ) : (
            <div key={stat.label}>{row}</div>
          );
        })}
      </div>
    </div>
  );
}
