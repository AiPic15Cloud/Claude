import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DealsService } from '../deals/deals.service';
import { ActivitiesService } from '../activities/activities.service';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { computeDeadlineAlert } from '../deals/deadline.util';
import { computeCrd } from '../deals/crd.util';

const NEEDS_ATTENTION = new Set(['SOUS_SURVEILLANCE', 'ELEVE', 'CRITIQUE']);
import { computeGuaranteeExpiry, isExpirableGuaranteeType } from '../guarantees/guarantee-expiry.util';

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
    private readonly riskEngine: RiskEngineService,
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
      guaranteesData,
      riskDeals,
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
        where: { organizationId, status: 'ACTIVE', dateMax: { not: null }, repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
        select: { id: true, name: true, reference: true, dateMax: true },
      }),
      this.prisma.deal.findMany({
        where: { organizationId },
        select: {
          amountRaised: true,
          startDate: true,
          createdAt: true,
          repayments: { where: { projected: false }, select: { amount: true, date: true } },
        },
      }),
      this.prisma.guarantee.findMany({
        where: {
          status: 'ACTIVE',
          endDate: { not: null },
          deal: { organizationId, repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
        },
        select: {
          id: true,
          type: true,
          description: true,
          endDate: true,
          dealId: true,
          deal: { select: { name: true, reference: true } },
        },
      }),
      this.prisma.deal.findMany({
        where: { organizationId, status: 'ACTIVE', repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] }, riskScore: { not: null } },
        select: { id: true, name: true, reference: true, amountRaised: true, riskScore: true, riskScorePrevious: true, surveillanceStatus: true, dateMax: true },
      }),
    ]);

    const decisions = await this.buildDecisions(organizationId, riskDeals);
    const pipeline = this.buildPipeline(pipelineDeals);
    const aumHistory = this.buildAumHistory(historyDeals);
    const deadlineAlerts = deadlineDeals
      .map((d) => ({ id: d.id, name: d.name, reference: d.reference, dateMax: d.dateMax, ...computeDeadlineAlert(d.dateMax) }))
      .filter((d) => d.level !== 'RAS')
      .sort((a, b) => a.daysToMax - b.daysToMax);
    const guaranteesToRenew = guaranteesData
      .filter((g) => isExpirableGuaranteeType(g.type))
      .map((g) => ({
        id: g.id,
        dealId: g.dealId,
        dealName: g.deal.name,
        dealReference: g.deal.reference,
        type: g.type,
        description: g.description,
        endDate: g.endDate,
        ...computeGuaranteeExpiry(g.type, g.endDate),
      }))
      .filter((g) => g.expiringSoon || g.validity === 'NON_VALIDE')
      .sort((a, b) => (a.daysToExpiry ?? -Infinity) - (b.daysToExpiry ?? -Infinity));

    const autoSummary = this.buildAutoSummary({
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
      guaranteesToRenew,
      autoSummary,
      decisions,
    };
  }

  /**
   * Centre de décision : les dossiers en zone WATCH/HIGH du Risk Engine,
   * triés par score puis exposition, avec le facteur qui contribue le plus
   * au score comme "Signal" — aucune nouvelle règle métier, uniquement une
   * agrégation du score déjà calculé (source unique de vérité sur "qu'est-ce
   * qui ne va pas sur ce dossier", plutôt que de mélanger Alerts/Tasks bruts
   * qui représentent déjà les mêmes événements séparément ailleurs dans ce
   * même écran).
   */
  private async buildDecisions(
    organizationId: string,
    riskDeals: {
      id: string;
      name: string;
      reference: string;
      amountRaised: any;
      riskScore: number | null;
      riskScorePrevious: number | null;
      surveillanceStatus: string | null;
      dateMax: Date | null;
    }[],
  ) {
    const candidates = riskDeals
      .filter((d) => d.riskScore !== null && d.surveillanceStatus !== null && NEEDS_ATTENTION.has(d.surveillanceStatus))
      .sort((a, b) => (b.riskScore! - a.riskScore!) || (Number(b.amountRaised) - Number(a.amountRaised)))
      .slice(0, 10);

    const [breakdowns, realized] = await Promise.all([
      Promise.all(candidates.map((d) => this.riskEngine.computeDealRisk(organizationId, d.id, false))),
      this.prisma.repayment.groupBy({
        by: ['dealId'],
        where: { dealId: { in: candidates.map((d) => d.id) }, projected: false },
        _sum: { amount: true },
      }),
    ]);
    const realizedByDeal = new Map(realized.map((r) => [r.dealId, Number(r._sum.amount ?? 0)]));

    return candidates.map((d, i) => {
      const breakdown = breakdowns[i];
      const topFactor = breakdown.triggered[0];
      const deadline = computeDeadlineAlert(d.dateMax, new Date(), false);
      return {
        dealId: d.id,
        dealName: d.name,
        dealReference: d.reference,
        // Le statut de surveillance a 4 paliers ; le Decision Center actuel
        // n'en affiche que 2 (Critique/Vigilance) — CRITIQUE devient HIGH,
        // SOUS_SURVEILLANCE/ELEVE restent WATCH. Une vraie Attention Queue à
        // paliers multiples est prévue en Phase 5, pas une refonte ici.
        tier: (d.surveillanceStatus === 'CRITIQUE' ? 'HIGH' : 'WATCH') as 'WATCH' | 'HIGH',
        score: d.riskScore!,
        previousScore: d.riskScorePrevious,
        signalLabel: topFactor?.label ?? 'Risque global',
        signalExplanation: topFactor ? `Contribution estimée : +${topFactor.points} pts.` : '',
        // CRD, pas le montant collecté d'origine — un dossier déjà remboursé
        // à 80% ne doit pas afficher son exposition historique comme montant
        // à risque aujourd'hui (voir crd.util.ts).
        exposition: computeCrd(Number(d.amountRaised), realizedByDeal.get(d.id) ?? 0),
        daysToMax: deadline.stage ? deadline.daysToMax : null,
        deadlineActionLabel: deadline.actionLabel,
      };
    });
  }

  /**
   * Un vrai CRD historique pour les 12 derniers mois — reconstruit à partir
   * des dates réelles des dossiers (startDate, à défaut createdAt) et des
   * dates réelles des remboursements réalisés, pas une table de snapshots
   * qu'on n'a pas. Pour chaque mois M : CRD(M) = Σ des dossiers déjà entrés
   * dans le portefeuille à M de max(0, amountRaised_actuel − remboursements
   * réalisés datés ≤ M). Approximation assumée : amountRaised n'étant pas
   * lui-même historisé, on suppose sa valeur actuelle valable rétroactivement
   * (fiable pour un dossier déjà clos à l'époque M, plus approximatif pour un
   * dossier encore en collecte à l'époque). La courbe peut redescendre — un
   * vrai CRD n'est pas monotone, contrairement à un cumul d'AUM onboardé.
   */
  private buildAumHistory(deals: { amountRaised: any; startDate: Date | null; createdAt: Date; repayments: { amount: any; date: Date }[] }[]) {
    const months = 12;
    const now = new Date();
    const points: { month: string; label: string; crd: number }[] = [];

    for (let i = months - 1; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthEnd = new Date(monthDate.getFullYear(), monthDate.getMonth() + 1, 0, 23, 59, 59, 999);
      const crd = deals
        .filter((d) => (d.startDate ?? d.createdAt) <= monthEnd)
        .reduce((sum, d) => {
          const realizedToDate = d.repayments.filter((r) => r.date <= monthEnd).reduce((s, r) => s + Number(r.amount), 0);
          return sum + computeCrd(Number(d.amountRaised), realizedToDate);
        }, 0);

      points.push({
        month: `${monthDate.getFullYear()}-${String(monthDate.getMonth() + 1).padStart(2, '0')}`,
        label: monthDate.toLocaleDateString('fr-FR', { month: 'short' }),
        crd,
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
   *
   * Returns a neutral headline (context, nothing to act on) plus a list of
   * items to action, each tagged with a severity so the UI can color-code by
   * urgency instead of burying everything in one flat sentence — 'critical'
   * for things with real consequences if missed (unread critical alerts,
   * vote deadlines about to lapse), 'warning' for urgent-but-not-yet-critical
   * work (HIGH/URGENT priority tasks), 'info' for routine same-day load.
   */
  private buildAutoSummary(input: {
    kpis: Awaited<ReturnType<DealsService['kpis']>>;
    todayTasksCount: number;
    urgentCount: number;
    criticalAlertsCount: number;
    deadlineUrgentCount: number;
  }): { headline: string; items: { label: string; severity: 'critical' | 'warning' | 'info' }[] } {
    const { kpis, todayTasksCount, urgentCount, criticalAlertsCount, deadlineUrgentCount } = input;

    const headline =
      `${kpis.activeDeals} opération${kpis.activeDeals > 1 ? 's' : ''} active${kpis.activeDeals > 1 ? 's' : ''}` +
      ` pour ${this.formatAmount(kpis.totalAum)} sous gestion, collecte à ${kpis.fundingProgress}%.`;

    const items: { label: string; severity: 'critical' | 'warning' | 'info' }[] = [];

    if (criticalAlertsCount > 0) {
      items.push({
        label: `${criticalAlertsCount} alerte${criticalAlertsCount > 1 ? 's' : ''} critique${criticalAlertsCount > 1 ? 's' : ''} à examiner`,
        severity: 'critical',
      });
    }

    if (deadlineUrgentCount > 0) {
      items.push({
        label: `${deadlineUrgentCount} échéance${deadlineUrgentCount > 1 ? 's' : ''} de vote urgente${deadlineUrgentCount > 1 ? 's' : ''} à traiter`,
        severity: 'critical',
      });
    }

    if (urgentCount > 0) {
      items.push({
        label: `${urgentCount} priorité${urgentCount > 1 ? 's' : ''} urgente${urgentCount > 1 ? 's' : ''} en attente`,
        severity: 'warning',
      });
    }

    if (todayTasksCount > 0) {
      items.push({ label: `${todayTasksCount} tâche${todayTasksCount > 1 ? 's' : ''} à traiter aujourd'hui`, severity: 'info' });
    } else {
      items.push({ label: `Aucune tâche planifiée aujourd'hui`, severity: 'info' });
    }

    return { headline, items };
  }

  private formatAmount(amount: number): string {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
      amount,
    );
  }
}
