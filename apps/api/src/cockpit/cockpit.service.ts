import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DealsService } from '../deals/deals.service';
import { ActivitiesService } from '../activities/activities.service';
import { computeDeadlineAlert } from '../deals/deadline.util';

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

@Injectable()
export class CockpitService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dealsService: DealsService,
    private readonly activitiesService: ActivitiesService,
  ) {}

  async summary(organizationId: string, userId: string) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86_400_000);

    const [
      kpis,
      todayTasks,
      priorityTasks,
      agendaTasks,
      unreadAlerts,
      recentActivities,
      pipelineDeals,
      deadlineDeals,
      historyDeals,
    ] = await Promise.all([
      this.dealsService.kpis(organizationId),
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          done: false,
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
        },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { priority: 'desc' },
      }),
      this.prisma.task.findMany({
        where: { assigneeId: userId, done: false, priority: { in: ['HIGH', 'URGENT'] } },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: { assigneeId: userId, done: false, dueDate: { gte: startOfDay(now), lte: in7Days } },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.alert.findMany({
        where: { organizationId, read: false },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.activitiesService.listRecentForOrganization(organizationId, 10),
      this.prisma.deal.findMany({
        where: { organizationId, status: 'ACTIVE' },
        select: { id: true, name: true, reference: true, stage: true, amountTarget: true, amountRaised: true },
      }),
      this.prisma.deal.findMany({
        where: { organizationId, status: 'ACTIVE', dateMax: { not: null }, repaid: false, stage: { not: 'DEFAUT' } },
        select: { id: true, name: true, reference: true, dateMax: true },
      }),
      this.prisma.deal.findMany({
        where: { organizationId },
        select: { amountTarget: true, startDate: true, createdAt: true },
      }),
    ]);

    const pipeline = this.buildPipeline(pipelineDeals);
    const aumHistory = this.buildAumHistory(historyDeals);
    const deadlineAlerts = deadlineDeals
      .map((d) => ({ id: d.id, name: d.name, reference: d.reference, dateMax: d.dateMax, ...computeDeadlineAlert(d.dateMax) }))
      .filter((d) => d.level !== 'RAS')
      .sort((a, b) => a.daysToMax - b.daysToMax);

    const summaryText = this.buildAutoSummary({
      kpis,
      todayTasksCount: todayTasks.length,
      urgentCount: priorityTasks.filter((t) => t.priority === 'URGENT').length,
      criticalAlertsCount: unreadAlerts.filter((a) => a.severity === 'CRITICAL').length,
      deadlineUrgentCount: deadlineAlerts.filter((d) => d.level === 'URGENT').length,
    });

    return {
      generatedAt: now.toISOString(),
      kpis,
      today: todayTasks,
      priorities: priorityTasks,
      agenda: agendaTasks,
      alerts: unreadAlerts,
      notifications: unreadAlerts.length,
      recentActivity: recentActivities,
      pipeline,
      aumHistory,
      deadlineAlerts,
      autoSummary: summaryText,
    };
  }

  /**
   * A monthly, cumulative "encours sous gestion" trend for the last 12
   * months — built from real deal dates (startDate, falling back to
   * createdAt like the fees chart does), not a stored snapshot series we
   * don't have. Every deal ever onboarded counts once it entered the
   * portfolio, regardless of its current stage/status, since the point is
   * "how much was under management at that point in time", not "how much
   * still is" — that's what the KPI tile already shows.
   */
  private buildAumHistory(deals: { amountTarget: any; startDate: Date | null; createdAt: Date }[]) {
    const months = 12;
    const now = new Date();
    const points: { month: string; label: string; cumulativeAum: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const cumulativeAum = deals
        .filter((d) => (d.startDate ?? d.createdAt) <= monthEnd)
        .reduce((sum, d) => sum + Number(d.amountTarget), 0);

      points.push({
        month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
        cumulativeAum,
      });
    }
    return points;
  }

  private buildPipeline(deals: { stage: string; amountTarget: any; amountRaised: any }[]) {
    const stages = ['SOURCING', 'ANALYSE', 'COMITE', 'MONTAGE', 'COLLECTE', 'FINANCE', 'SUIVI', 'REMBOURSE', 'DEFAUT'];
    return stages.map((stage) => {
      const dealsInStage = deals.filter((d) => d.stage === stage);
      return {
        stage,
        count: dealsInStage.length,
        totalAmount: dealsInStage.reduce((sum, d) => sum + Number(d.amountTarget), 0),
      };
    });
  }

  /**
   * Deterministic, rule-based digest of the day's KPIs.
   * The conversational "Résumé IA" from the product spec (module 9 — Agents IA)
   * is a separate, not-yet-built capability; this generator is intentionally
   * transparent and non-LLM so it never overstates what's implemented.
   */
  private buildAutoSummary(input: {
    kpis: Awaited<ReturnType<DealsService['kpis']>>;
    todayTasksCount: number;
    urgentCount: number;
    criticalAlertsCount: number;
    deadlineUrgentCount: number;
  }): string {
    const { kpis, todayTasksCount, urgentCount, criticalAlertsCount, deadlineUrgentCount } = input;
    const parts: string[] = [];

    parts.push(
      `${kpis.activeDeals} opération${kpis.activeDeals > 1 ? 's' : ''} active${kpis.activeDeals > 1 ? 's' : ''}` +
        ` pour ${this.formatAmount(kpis.totalAum)} sous gestion, collecte à ${kpis.fundingProgress}%.`,
    );

    if (todayTasksCount > 0) {
      parts.push(`${todayTasksCount} tâche${todayTasksCount > 1 ? 's' : ''} à traiter aujourd'hui.`);
    } else {
      parts.push(`Aucune tâche planifiée aujourd'hui.`);
    }

    if (urgentCount > 0) {
      parts.push(`${urgentCount} priorité${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''} en attente.`);
    }

    if (criticalAlertsCount > 0) {
      parts.push(`${criticalAlertsCount} alerte${criticalAlertsCount > 1 ? 's' : ''} critique${criticalAlertsCount > 1 ? 's' : ''} à examiner.`);
    }

    if (deadlineUrgentCount > 0) {
      parts.push(
        `${deadlineUrgentCount} échéance${deadlineUrgentCount > 1 ? 's' : ''} de vote urgente${deadlineUrgentCount > 1 ? 's' : ''} à traiter.`,
      );
    }

    return parts.join(' ');
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      amount,
    );
  }
}
