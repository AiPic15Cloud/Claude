import { PageHeader } from "@/components/ui/PageHeader";
import { Card, SectionLabel } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export function ModuleStub({
  eyebrow,
  title,
  subtitle,
  capabilities,
}: {
  eyebrow: string;
  title: string;
  subtitle: string;
  capabilities: string[];
}) {
  return (
    <div>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        subtitle={subtitle}
        action={<Badge tone="accent">En construction</Badge>}
      />
      <Card>
        <SectionLabel>Prévu pour ce module</SectionLabel>
        <ul className="mt-4 flex flex-col gap-2.5">
          {capabilities.map((c, i) => (
            <li key={i} className="flex gap-2.5 text-sm text-muted">
              <span className="text-faint">—</span>
              <span>{c}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
