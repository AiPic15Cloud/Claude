import type { ReactNode } from "react";

export function PageHeader({
  eyebrow,
  title,
  subtitle,
  action,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 border-b border-line pb-6 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
      <div>
        {eyebrow && (
          <p className="mb-1.5 text-micro font-medium uppercase tracking-wider text-faint">
            {eyebrow}
          </p>
        )}
        <h1 className="text-xl font-medium text-ink">{title}</h1>
        {subtitle && <p className="mt-1.5 max-w-2xl text-sm text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
