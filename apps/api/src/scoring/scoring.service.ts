import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

export interface ScoreFactor {
  key: string;
  label: string;
  /** 0-100 */
  value: number;
  /** Share of the final score, 0-1 */
  weight: number;
  contribution: number;
  explanation: string;
}

export interface ScoreBreakdown {
  score: number;
  factors: ScoreFactor[];
  computedAt: string;
  disclaimer: string;
}

const DISCLAIMER =
  "Score ATLAS propriétaire, calculé de façon transparente à partir des données de la plateforme. " +
  "Ce n'est pas une notation financière officielle.";

/**
 * Score ATLAS — a transparent, explainable scoring engine.
 * Every factor is derived from real, persisted data (documents, notes,
 * task punctuality, funding progress, network density…), never from an
 * external rating or fabricated figure, and every factor's contribution
 * is returned alongside the final score so it can be audited by an analyst.
 */
@Injectable()
export class ScoringService {
  constructor(private readonly prisma: PrismaService) {}

  async computeDealScore(organizationId: string, dealId: string, persist = true): Promise<ScoreBreakdown> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      include: {
        documents: true,
        notes: true,
        tags: true,
        entityLinks: true,
        tasks: true,
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const now = new Date();
    const overdueTasks = deal.tasks.filter((t) => !t.done && t.dueDate && t.dueDate < now).length;
    const totalTasks = deal.tasks.length;

    const stageRank: Record<string, number> = {
      SOURCING: 1,
      ANALYSE: 2,
      COMITE: 3,
      MONTAGE: 4,
      COLLECTE: 5,
      FINANCE: 6,
      SUIVI: 7,
      REMBOURSE: 8,
      DEFAUT: 0,
    };

    const recentNotes = deal.notes.filter(
      (n) => now.getTime() - n.createdAt.getTime() < 90 * 86_400_000,
    ).length;

    const assigneeDealCount = deal.assignedToId
      ? await this.prisma.deal.count({ where: { organizationId, assignedToId: deal.assignedToId } })
      : 1;

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

    const factors: Omit<ScoreFactor, 'contribution'>[] = [
      {
        key: 'documentation',
        label: 'Documentation',
        weight: 0.15,
        value: clamp((deal.documents.length / 5) * 100),
        explanation: `${deal.documents.length} document(s) déposé(s) sur le dossier.`,
      },
      {
        key: 'communication',
        label: 'Communication',
        weight: 0.15,
        value: clamp((recentNotes / 4) * 100),
        explanation: `${recentNotes} note(s) ajoutée(s) au cours des 90 derniers jours.`,
      },
      {
        key: 'ponctualite',
        label: 'Ponctualité (retards)',
        weight: 0.2,
        value: totalTasks === 0 ? 70 : clamp(100 - (overdueTasks / totalTasks) * 100),
        explanation:
          totalTasks === 0
            ? 'Aucune tâche créée sur le dossier — score neutre.'
            : `${overdueTasks} tâche(s) en retard sur ${totalTasks} au total.`,
      },
      {
        key: 'croissance',
        label: 'Croissance / avancement',
        weight: 0.15,
        value:
          deal.stage === 'DEFAUT'
            ? 0
            : Number(deal.amountTarget) > 0 && ['COLLECTE', 'FINANCE', 'SUIVI', 'REMBOURSE'].includes(deal.stage)
              ? clamp((Number(deal.amountRaised) / Number(deal.amountTarget)) * 100)
              : clamp((stageRank[deal.stage] / 8) * 100),
        explanation: `Étape actuelle : ${deal.stage}.`,
      },
      {
        key: 'diversification',
        label: 'Diversification',
        weight: 0.1,
        value: clamp((deal.tags.length / 3) * 100),
        explanation: `${deal.tags.length} tag(s) de classification associé(s).`,
      },
      {
        key: 'recurrence',
        label: 'Récurrence',
        weight: 0.1,
        value: clamp((assigneeDealCount / 5) * 100),
        explanation: `${assigneeDealCount} opération(s) suivie(s) par l'analyste assigné.`,
      },
      {
        key: 'reseau',
        label: 'Réseau (intervenants liés)',
        weight: 0.1,
        value: clamp((deal.entityLinks.length / 3) * 100),
        explanation: `${deal.entityLinks.length} intervenant(s) du Knowledge Graph rattaché(s) au dossier.`,
      },
      {
        key: 'historique',
        label: 'Historique / remboursements',
        weight: 0.05,
        value: deal.stage === 'REMBOURSE' ? 100 : deal.stage === 'DEFAUT' ? 0 : 60,
        explanation:
          deal.stage === 'REMBOURSE'
            ? 'Opération intégralement remboursée.'
            : deal.stage === 'DEFAUT'
              ? 'Opération en défaut.'
              : "Pas encore d'historique de remboursement — score neutre.",
      },
    ];

    const withContribution: ScoreFactor[] = factors.map((f) => ({
      ...f,
      contribution: Math.round(f.value * f.weight * 10) / 10,
    }));

    const score = Math.round(withContribution.reduce((sum, f) => sum + f.value * f.weight, 0));

    if (persist) {
      await this.prisma.deal.update({ where: { id: dealId }, data: { atlasScore: score } });
    }

    return {
      score,
      factors: withContribution,
      computedAt: now.toISOString(),
      disclaimer: DISCLAIMER,
    };
  }
}
