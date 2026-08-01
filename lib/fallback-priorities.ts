import type { AtlasPriority, AtlasPriorityCategory } from "@/lib/atlas/cio";
import { daysUntil } from "@/lib/format";
import type { Alert, AtlasTask, Deal } from "@/lib/types";

// Utilisé quand Atlas (Claude API) n'est pas configuré : dérive les priorités
// directement des données plutôt que de laisser le module Home vide.
export function buildFallbackPriorities(
  deals: Deal[],
  alerts: Alert[],
  tasks: AtlasTask[],
): AtlasPriority[] {
  const priorities: AtlasPriority[] = [];

  const criticalAlerts = alerts.filter((a) => !a.resolved && a.severity === "critique");
  for (const a of criticalAlerts) {
    priorities.push({
      titre: a.type,
      categorie: "risque",
      urgence: "haute",
      description: a.message,
    });
  }

  const voteDeals = deals.filter((d) => d.stage === "comite" && d.vote_expires_at);
  for (const d of voteDeals) {
    const jours = daysUntil(d.vote_expires_at as string);
    priorities.push({
      titre: `Vote requis — ${d.name}`,
      categorie: "decision",
      urgence: jours <= 5 ? "haute" : "moyenne",
      description: `Le vote de comité expire dans ${jours} jour(s). Statut : ${d.statut_detail}`,
    });
  }

  const highAlerts = alerts.filter((a) => !a.resolved && a.severity === "elevee");
  for (const a of highAlerts) {
    priorities.push({
      titre: a.type,
      categorie: "operation_critique",
      urgence: "moyenne",
      description: a.message,
    });
  }

  const urgentTasks = tasks.filter((t) => t.priority === "haute" && t.status !== "fait");
  for (const t of urgentTasks) {
    priorities.push({
      titre: t.title,
      categorie: "calendrier" satisfies AtlasPriorityCategory,
      urgence: "moyenne",
      description: t.description ?? "",
    });
  }

  return priorities.slice(0, 5);
}
