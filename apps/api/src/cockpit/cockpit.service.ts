import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { DealsService } from '../deals/deals.service';
import { ActivitiesService } from '../activities/activities.service';
import { RiskEngineService, DISCLAIMER } from '../risk-engine/risk-engine.service';
import { ActionItemsService } from '../action-items/action-items.service';
import { ACTION_TYPE_CTA_LABELS } from '../action-items/dto/create-action-item.dto';
import { computePipelineConversion } from '../fractional/pipeline-conversion.util';
import { computeDeadlineAlert } from '../deals/deadline.util';
import { computeCrd } from '../deals/crd.util';

const MAX_A_DECIDER_CARDS = 5;

export interface ActionQueueCard {
  id: string;
  operation: string;
  reference: string | null;
  motif: string;
  ownerLabel: string | null;
  dueAt: string | null;
  blocking: boolean;
  status: 'A_FAIRE' | 'EN_ATTENTE_EXTERNE' | 'A_DECIDER' | 'TERMINEE' | 'ECARTEE';
  ctaLabel: string;
  deepLink: string;
}

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
    private readonly actionItems: ActionItemsService,
  ) {}

  /**
   * `restricted` (Lot B — espaces étanches, spec §11.11 "associé sans accès
   * dette par toute surface, y compris agrégats") : un compte
   * FRACTIONAL_ONLY ne doit recevoir aucune donnée dérivée d'un Deal via ce
   * tableau de bord — chaque requête Deal/task/alert/action-item ci-dessous
   * est soit sautée, soit filtrée sur `dealId: null`, jamais fusionnée avec
   * les données Fractionné qui restent, elles, pleinement visibles.
   */
  async summary(organizationId: string, userId: string, restricted = false) {
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 86_400_000);
    const dealExcluded = restricted ? ({ dealId: null } as const) : {};

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
      overdueTasksTotal,
      overdueTasksUrgent,
    ] = await Promise.all([
      this.dealsService.kpis(organizationId, restricted),
      this.prisma.task.findMany({
        where: {
          assigneeId: userId,
          done: false,
          cancelledAt: null,
          dueDate: { gte: startOfDay(now), lte: endOfDay(now) },
          ...dealExcluded,
        },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { priority: 'desc' },
      }),
      this.prisma.task.findMany({
        where: { assigneeId: userId, done: false, cancelledAt: null, priority: { in: ['HIGH', 'URGENT'] }, ...dealExcluded },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { dueDate: 'asc' },
        take: 10,
      }),
      this.prisma.task.findMany({
        where: { assigneeId: userId, done: false, cancelledAt: null, dueDate: { gte: startOfDay(now), lte: in7Days }, ...dealExcluded },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { dueDate: 'asc' },
        take: 20,
      }),
      this.prisma.alert.findMany({
        where: { organizationId, read: false, ...dealExcluded },
        include: { deal: { select: { id: true, name: true, reference: true } } },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      // Activity n'a pas de fractionalProjectId — c'est exclusivement un
      // journal Deal (voir schema.prisma) : pour un compte restreint, la
      // seule réponse honnête est [], jamais une requête filtrée après coup.
      restricted ? Promise.resolve([]) : this.activitiesService.listRecentForOrganization(organizationId, 10),
      restricted
        ? Promise.resolve([])
        : this.prisma.deal.findMany({
            where: { organizationId, status: 'ACTIVE' },
            select: { id: true, name: true, reference: true, stage: true, amountTarget: true, amountRaised: true },
          }),
      restricted
        ? Promise.resolve([])
        : this.prisma.deal.findMany({
            where: { organizationId, status: 'ACTIVE', dateMax: { not: null }, repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] } },
            select: { id: true, name: true, reference: true, dateMax: true },
          }),
      restricted
        ? Promise.resolve([])
        : this.prisma.deal.findMany({
            where: { organizationId },
            select: {
              amountRaised: true,
              startDate: true,
              createdAt: true,
              repayments: { where: { projected: false }, select: { amount: true, date: true } },
            },
          }),
      restricted
        ? Promise.resolve([])
        : this.prisma.guarantee.findMany({
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
              substantiveDefect: true,
              deal: { select: { name: true, reference: true } },
            },
          }),
      restricted
        ? Promise.resolve([])
        : this.prisma.deal.findMany({
            where: { organizationId, status: 'ACTIVE', repaid: false, stage: { notIn: ['DEFAUT', 'REMBOURSE'] }, riskScore: { not: null } },
            select: { id: true, name: true, reference: true, amountRaised: true, riskScore: true, riskScorePrevious: true, surveillanceStatus: true, dateMax: true },
          }),
      // Remontée portefeuille (A.7) — toute l'organisation, pas seulement
      // l'utilisateur courant (todayTasks/priorityTasks/agendaTasks
      // ci-dessus sont personnels) : un agrégat "portefeuille" doit compter
      // les tâches en retard de tout le monde.
      this.prisma.task.count({ where: { organizationId, done: false, cancelledAt: null, dueDate: { lt: now }, ...dealExcluded } }),
      this.prisma.task.count({ where: { organizationId, done: false, cancelledAt: null, dueDate: { lt: now }, priority: 'URGENT', ...dealExcluded } }),
    ]);

    const decisions = await this.buildDecisions(organizationId, riskDeals);
    const prequalDecisions = await this.buildPrequalDecisions(organizationId, restricted);
    const openActionItems = await this.actionItems.findOpenForOrganization(organizationId, restricted);
    const actionQueue = this.buildActionQueue(decisions, prequalDecisions, openActionItems);
    const [fractionalStatusHistory, fractionalProjectCount] = await Promise.all([
      this.prisma.fractionalStatusHistory.findMany({
        where: { project: { organizationId } },
        select: { projectId: true, toStatus: true, changedAt: true },
      }),
      this.prisma.fractionalProject.count({ where: { organizationId } }),
    ]);
    const fractionalPipelineConversion = computePipelineConversion(fractionalStatusHistory, fractionalProjectCount);
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
        ...computeGuaranteeExpiry(g.type, g.endDate, g.substantiveDefect),
      }))
      .filter((g) => g.expiringSoon || g.validity === 'NON_VALIDE')
      .sort((a, b) => (a.daysToExpiry ?? -Infinity) - (b.daysToExpiry ?? -Infinity));

    const autoSummary = this.buildAutoSummary({
      kpis,
      todayTasksCount: todayTasks.length,
      urgentCount: priorityTasks.filter((t) => t.priority === 'URGENT').length,
      criticalAlertsCount: unreadAlerts.filter((a) => a.severity === 'CRITICAL').length,
      deadlineUrgentCount: deadlineAlerts.filter((d) => d.level === 'URGENT').length,
      overdueTasksTotal,
      overdueTasksUrgent,
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
      actionQueue,
      fractionalPipelineConversion,
      overdueTasks: { total: overdueTasksTotal, urgent: overdueTasksUrgent },
    };
  }

  /**
   * Fusionne le Decision Center existant (Deal, calculé à la volée) et la
   * nouvelle file ActionItem persistée (Fractionné et futurs producteurs)
   * en une seule vue "à décider"/"à faire"/"en attente" (spec Cockpit/
   * Fractionné P1 §4.1/§4.2) — additif, ne remplace pas `decisions` dont
   * DecisionCenterCard dépend encore.
   */
  private buildActionQueue(
    decisions: Awaited<ReturnType<CockpitService['buildDecisions']>>,
    prequalDecisions: Awaited<ReturnType<CockpitService['buildPrequalDecisions']>>,
    openActionItems: Awaited<ReturnType<ActionItemsService['findOpenForOrganization']>>,
  ): { aDecider: ActionQueueCard[]; aFaire: ActionQueueCard[]; enAttente: ActionQueueCard[] } {
    const fromDecisions: ActionQueueCard[] = decisions.map((d) => ({
      id: `deal-risk-${d.dealId}`,
      operation: d.dealName,
      reference: d.dealReference,
      motif: d.signalExplanation || d.signalLabel,
      ownerLabel: null,
      dueAt: d.daysToMax !== null ? new Date(Date.now() + d.daysToMax * 86_400_000).toISOString() : null,
      blocking: d.tier === 'HIGH',
      status: 'A_DECIDER',
      ctaLabel: d.deadlineActionLabel || 'Examiner le risque',
      deepLink: `/deals/${d.dealId}`,
    }));

    const fromActionItems: ActionQueueCard[] = openActionItems.map((a) => {
      const operationName = a.deal?.name ?? a.fractionalProject?.name ?? '—';
      const reference = a.deal?.reference ?? a.fractionalProject?.reference ?? null;
      return {
        id: a.id,
        operation: operationName,
        reference,
        motif: a.label,
        ownerLabel: a.owner ? `${a.owner.firstName} ${a.owner.lastName}`.trim() : null,
        dueAt: a.dueAt ? a.dueAt.toISOString() : null,
        blocking: a.blocking,
        status: a.status,
        ctaLabel: ACTION_TYPE_CTA_LABELS[a.actionType] ?? 'Traiter',
        deepLink: a.deepLink,
      };
    });

    const fromPrequalDecisions: ActionQueueCard[] = prequalDecisions.map((p) => ({
      id: `prequal-blocking-${p.caseId}`,
      operation: p.caseName,
      reference: null,
      motif: p.statement,
      ownerLabel: null,
      dueAt: null,
      blocking: true,
      status: 'A_DECIDER',
      ctaLabel: 'Lever le blocage',
      deepLink: `/prequalification/${p.caseId}`,
    }));

    const all = [...fromActionItems, ...fromDecisions, ...fromPrequalDecisions];
    const byPriority = (a: ActionQueueCard, b: ActionQueueCard) => {
      if (a.blocking !== b.blocking) return a.blocking ? -1 : 1;
      if (a.dueAt === null && b.dueAt === null) return 0;
      if (a.dueAt === null) return 1;
      if (b.dueAt === null) return -1;
      return new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime();
    };

    const aDecider = all.filter((c) => c.status === 'A_DECIDER').sort(byPriority).slice(0, MAX_A_DECIDER_CARDS);
    // "À faire" / "en attente externe" (spec §4.1.3) ne viennent que de la
    // file générique — le Decision Center legacy n'a pas cette distinction.
    const aFaire = fromActionItems.filter((c) => c.status === 'A_FAIRE').sort(byPriority);
    const enAttente = fromActionItems.filter((c) => c.status === 'EN_ATTENTE_EXTERNE').sort(byPriority);

    return { aDecider, aFaire, enAttente };
  }

  /**
   * Export structuré portefeuille (spec ATLAS v2, A.11) — pour un reporting
   * fonds/investisseur, pas le tableau de bord personnel de l'utilisateur
   * courant : réutilise exactement les agrégats déjà calculés par
   * DealsService.kpis() (distribution par palier de risque, concentration
   * opérateur, exposition géographique, stress test) et les deux mêmes
   * comptages de tâches en retard que summary(), mais exclut tous les
   * widgets personnels (tâches du jour, alertes non lues, pipeline...) qui
   * n'ont pas leur place dans un rapport destiné à un tiers.
   */
  async exportPortfolioReport(organizationId: string, restricted = false) {
    const now = new Date();
    const dealExcluded = restricted ? ({ dealId: null } as const) : {};
    const [kpis, overdueTasksTotal, overdueTasksUrgent] = await Promise.all([
      this.dealsService.kpis(organizationId, restricted),
      this.prisma.task.count({ where: { organizationId, done: false, cancelledAt: null, dueDate: { lt: now }, ...dealExcluded } }),
      this.prisma.task.count({ where: { organizationId, done: false, cancelledAt: null, dueDate: { lt: now }, priority: 'URGENT', ...dealExcluded } }),
    ]);

    return {
      reportVersion: 1,
      generatedAt: now.toISOString(),
      kpis,
      overdueTasks: { total: overdueTasksTotal, urgent: overdueTasksUrgent },
      disclaimer: DISCLAIMER,
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
   * Lot C (Actions et parcours) : un dossier Préqual avec un `Finding` non
   * résolu de sévérité BLOCKING est lui aussi un blocage majeur qui doit
   * remonter dans "À décider" (spec §10, recette "chaque blocage majeur
   * crée une action pertinente") — jusqu'ici ces findings n'étaient
   * vérifiés qu'au moment de la tentative de promotion (promotion.service.ts),
   * jamais remontés en amont. Calculé à la volée comme `buildDecisions`
   * ci-dessus plutôt que persisté en ActionItem : `Finding.reviewStatus`
   * reflète déjà l'état courant à chaque lecture, la double-écriture
   * n'apporterait rien. PrequalificationCase est un dossier dette en
   * puissance (promotion vers Deal) : sauté pour un compte restreint, même
   * doctrine que `riskDeals` plus haut.
   */
  private async buildPrequalDecisions(organizationId: string, restricted: boolean) {
    if (restricted) return [];

    const cases = await this.prisma.prequalificationCase.findMany({
      where: {
        organizationId,
        status: { in: ['DRAFT', 'NEEDS_REVIEW'] },
        findings: { some: { severity: 'BLOCKING', reviewStatus: { in: ['PENDING', 'ACCEPTED'] } } },
      },
      select: {
        id: true,
        name: true,
        findings: {
          where: { severity: 'BLOCKING', reviewStatus: { in: ['PENDING', 'ACCEPTED'] } },
          select: { statement: true },
          orderBy: { createdAt: 'asc' },
          take: 1,
        },
      },
      take: 10,
    });

    return cases.map((c) => ({
      caseId: c.id,
      caseName: c.name,
      statement: c.findings[0]?.statement ?? 'Blocage à lever avant validation.',
    }));
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
    overdueTasksTotal: number;
    overdueTasksUrgent: number;
  }): { headline: string; items: { label: string; severity: 'critical' | 'warning' | 'info' }[] } {
    const { kpis, todayTasksCount, urgentCount, criticalAlertsCount, deadlineUrgentCount, overdueTasksTotal, overdueTasksUrgent } = input;

    const headline =
      `${kpis.activeDeals} opération${kpis.activeDeals > 1 ? 's' : ''} active${kpis.activeDeals > 1 ? 's' : ''}` +
      ` pour ${this.formatAmount(kpis.totalCrd)} d'encours, collecte à ${kpis.fundingProgress}% de l'objectif.`;

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

    if (overdueTasksTotal > 0) {
      items.push({
        label:
          `${overdueTasksTotal} tâche${overdueTasksTotal > 1 ? 's' : ''} en retard sur le portefeuille` +
          (overdueTasksUrgent > 0 ? ` dont ${overdueTasksUrgent} urgente${overdueTasksUrgent > 1 ? 's' : ''}` : ''),
        severity: overdueTasksUrgent > 0 ? 'critical' : 'warning',
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
