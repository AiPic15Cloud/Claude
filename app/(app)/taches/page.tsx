import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card, CardHeader } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { getDeals, getTasks } from "@/lib/data";
import { formatDate } from "@/lib/format";
import type { TaskStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_LABELS: Record<TaskStatus, string> = {
  a_faire: "À faire",
  en_cours: "En cours",
  fait: "Terminé",
};

const PRIORITY_TONE = { haute: "high", moyenne: "medium", basse: "low" } as const;

export default async function TaskEnginePage() {
  const [tasks, deals] = await Promise.all([getTasks(), getDeals()]);
  const dealById = new Map(deals.map((d) => [d.id, d]));

  const groups: TaskStatus[] = ["a_faire", "en_cours", "fait"];

  return (
    <div>
      <PageHeader
        eyebrow="Module 13"
        title="Task Engine"
        subtitle="Chaque alerte génère automatiquement une tâche, une priorité, une échéance et un rappel. Nicolas ne crée presque jamais de tâche lui-même — Atlas les crée."
      />

      <div className="flex flex-col gap-6">
        {groups.map((status) => {
          const group = tasks.filter((t) => t.status === status);
          if (group.length === 0) return null;
          return (
            <Card key={status}>
              <CardHeader title={STATUS_LABELS[status]} subtitle={`${group.length} tâche(s)`} />
              <div className="flex flex-col gap-2">
                {group.map((task) => {
                  const deal = task.related_deal_id ? dealById.get(task.related_deal_id) : null;
                  const content = (
                    <div className="flex items-center justify-between rounded border border-line px-4 py-3">
                      <div>
                        <div className="mb-0.5 flex items-center gap-2">
                          <p className="text-sm text-ink">{task.title}</p>
                          <Badge tone={PRIORITY_TONE[task.priority]}>{task.priority}</Badge>
                          {task.source === "alerte" && <Badge tone="accent">Généré par alerte</Badge>}
                        </div>
                        {task.description && <p className="text-xs text-muted">{task.description}</p>}
                      </div>
                      {task.due_date && (
                        <span className="whitespace-nowrap text-xs text-faint">
                          Échéance {formatDate(task.due_date)}
                        </span>
                      )}
                    </div>
                  );
                  return deal ? (
                    <Link key={task.id} href={`/pipeline/${deal.id}`} className="hover:opacity-90">
                      {content}
                    </Link>
                  ) : (
                    <div key={task.id}>{content}</div>
                  );
                })}
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
