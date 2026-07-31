import * as React from 'react';
import { cn } from '@/lib/utils';

export interface PageHeaderProps extends React.HTMLAttributes<HTMLDivElement> {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: React.ReactNode;
}

const PageHeader = React.forwardRef<HTMLDivElement, PageHeaderProps>(
  ({ className, eyebrow, title, description, actions, ...props }, ref) => (
    <div
      ref={ref}
      className={cn('flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between', className)}
      {...props}
    >
      <div>
        {eyebrow && (
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{eyebrow}</p>
        )}
        <h1 className="font-display text-xl font-semibold tracking-tight">{title}</h1>
        {description && <p className="text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  ),
);
PageHeader.displayName = 'PageHeader';

export { PageHeader };
