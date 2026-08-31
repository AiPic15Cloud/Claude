import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import type { DealRecoveryStatus, DealSurveillanceStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { RiskDataService } from '../risk-data/risk-data.service';
import { FinancialModelService } from '../financial-model/financial-model.service';
import { isDealClosed } from '../common/deal-lifecycle.util';
import { computeDeadlineAlert } from '../deals/deadline.util';
import { computeDurationTargetAlert } from '../deals/duration-target.util';
import { computeCheckpointHealth } from '../deals/checkpoint-health.util';
import { computeGuaranteeExpiry } from '../guarantees/guarantee-expiry.util';
import { computeNewsletterStatus } from '../deals/newsletter.util';
import { computeRiskScore, RISK_INDICATOR_DEFINITIONS, type CheckpointFields, type TriggeredIndicator } from './additive-risk.util';
import { classifySurveillanceStatus, SURVEILLANCE_RANK } from './surveillance-status.util';
import { classifyVelocity } from './risk-velocity.util';
import { HARD_OVERRIDE_RULES } from './hard-override-rules';
import { RiskOverrideService } from './risk-override.service';
import { RiskHistoryService } from './risk-history.service';
import { computeCrd, sumRealizedRepayments } from '../deals/crd.util';
import { computeCompleteness, type CompletenessResult } from './completeness.util';
import { computeDataFreshness, type DataFreshnessResult } from './data-freshness.util';

export interface DealRiskProfile {
  dealId: string;
  suppressed: boolean;
  computedAt: string;
  disclaimer: string;
  composite: {
    score: number | null;
    previousScore: number | null;
    trend: 'UP' | 'DOWN' | 'FLAT' | null;
    deltas: { d7: number | null; d30: number | null; d90: number | null };
  };
  triggered: TriggeredIndicator[];
  surveillance: {
    status: DealSurveillanceStatus | null;
    automaticStatus: DealSurveillanceStatus | null;
    velocity: { band: string; direction: string; delta90: number | null } | null;
    hardOverrides: { ruleKey: string; label: string; minimumSurveillanceStatus: DealSurveillanceStatus; triggeredAt: string }[];
    analystOverride: { overrideStatus: DealSurveillanceStatus; justification: string; createdAt: string; createdByName: string } | null;
  };
  cycleProjet: 'EN_COURS' | 'SORTIE' | 'REMBOURSEMENT' | 'CLOTURE';
  recoveryStatus: DealRecoveryStatus | null;
  completeness: CompletenessResult | null;
  dataFreshness: DataFreshnessResult | null;
  /**
   * Explication de la couverture par garanties de rang 1, toujours renseignée
   * (bonne ou mauvaise) — distincte de `triggered`, qui ne liste que les
   * indicateurs dégradant le score. Nécessaire pour le header (A.3, ligne
   * "Protection") qui doit décrire la protection même quand elle est bonne.
   */
  guaranteeProtection: string;
}

const DISCLAIMER =
  'Risk Engine ATLAS — score de risque propriétaire, calculé de façon transparente à partir des données du dossier. ' +
  "Ce n'est pas une notation financière officielle et ne remplace pas le jugement d'un analyste.";

const METHODOLOGY_DISCLAIMER =
  "Ces pondérations sont une grille experte interne (jugement métier sur l'importance relative de chaque signal), pas un modèle calibré " +
  "statistiquement : ATLAS ne dispose pas encore d'un historique de dossiers clos en nombre suffisant pour valider ou ajuster ces poids " +
  'par la donnée. La section "Validation rétrospective" accumule cet historique au fil des clôtures réelles — à consulter pour juger de ' +
  'la fiabilité du modèle avant de le traiter comme une notation stabilisée.';

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;
const DAY_MS = 86_400_000;

// Exporté pour réutilisation par AgentsService.buildDealContext() — même
// texte que les explications du Risk Engine, pas de nouvelle rédaction.
export const PORTEUR_LABEL: Record<string, string> = {
  actif: 'Statut administratif actif.',
  fermee: 'Société fermée/radiée.',
  procedure_collective: 'Procédure collective en cours.',
};

const num = (v: unknown): number | null => (v === null || v === undefined ? null : Number(v));

interface RawCheckpoint {
  travauxBudgetInitial: unknown;
  travauxDepensesADate: unknown;
  prixVenteInitialPrevu: unknown;
  prixVenteActualise: unknown;
  prixVenteReelADate: unknown;
  pourcentageVendu: number | null;
  commercialisationLancee: boolean;
  createdAt: Date;
}

function pctDelta(from: number | null, to: number | null): number | null {
  if (from === null || from <= 0 || to === null) return null;
  return ((to - from) / from) * 100;
}

function describeGuaranteeCoverage(ratio: number | null): string {
  if (ratio === null || ratio === 0) return 'Aucune garantie de premier rang active.';
  return `Garanties de rang 1 couvrant ${(ratio * 100).toFixed(0)}% du capital restant dû.`;
}

/**
 * Moteur de surveillance ATLAS — score additif unique (v3.0, spec "Le
 * Traçotin" A.2) : un seul score transparent (liste d'indicateurs, chacun
 * ajoutant des points fixes, somme plafonnée à 100) remplace l'ancien blend
 * pondéré Quality (25%) / Performance (35%) / EWS (40%), sans perdre aucun
 * des signaux déjà réels qu'il couvrait. Statut de surveillance à 4 paliers,
 * une trajectoire historisée (RiskScoreSnapshot, jamais écrasée), et des hard
 * overrides qu'aucun bon score ne peut compenser mathématiquement. Le score
 * (headline "Risk X/100") réutilise les colonnes Deal.riskScore* existantes.
 *
 * Chaque indicateur réutilise autant que possible les fonctions pures déjà en
 * production (computeDeadlineAlert, computeCheckpointHealth,
 * computeGuaranteeExpiry, computeNewsletterStatus, FinancialModelService)
 * plutôt que d'inventer une nouvelle logique de risque.
 */
@Injectable()
export class RiskEngineService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly riskData: RiskDataService,
    private readonly financialModel: FinancialModelService,
    private readonly riskOverrides: RiskOverrideService,
    private readonly riskHistory: RiskHistoryService,
  ) {}

  onApplicationBootstrap() {
    void this.recomputeAll();
    setInterval(() => void this.recomputeAll(), CHECK_INTERVAL_MS);
  }

  /** Filet de sécurité : rattrape tout ce qui n'est pas branché sur un déclencheur événementiel explicite. */
  private async recomputeAll() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE' },
      select: { id: true, organizationId: true },
    });

    let alerted = 0;
    for (const deal of deals) {
      try {
        const before = await this.prisma.deal.findUnique({ where: { id: deal.id }, select: { surveillanceStatus: true } });
        const profile = await this.computeDealRisk(deal.organizationId, deal.id, true, 'scheduled_sweep');
        if (before?.surveillanceStatus !== profile.surveillance.status) alerted += profile.suppressed ? 0 : 1;
      } catch (err) {
        this.logger.error(`Échec du calcul de risque pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (alerted > 0) this.logger.log(`Risk Engine : ${alerted} dossier(s) recalculé(s) avec un statut modifié.`);
  }

  /** Utilisé par les déclencheurs événementiels (checkpoint, garantie, recouvrement, surveillance société). */
  async recomputeAndPersist(organizationId: string, dealId: string): Promise<void> {
    await this.computeDealRisk(organizationId, dealId, true, 'event');
  }

  async computeDealRisk(organizationId: string, dealId: string, persist = false, trigger = 'manual_recompute'): Promise<DealRiskProfile> {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: {
        id: true,
        reference: true,
        name: true,
        repaid: true,
        stage: true,
        amountRaised: true,
        dateMax: true,
        startDate: true,
        durationMonths: true,
        recoveryStatus: true,
        porteurSiren: true,
        porteurMonitoringStatus: true,
        lastNewsletterDate: true,
        newsletterTargetDays: true,
        lat: true,
        lng: true,
        postcode: true,
        porteurCheckedAt: true,
        riskDataCheckedAt: true,
        dpeCheckedAt: true,
        riskScore: true,
        riskScorePrevious: true,
        riskScoreAtClosure: true,
        surveillanceStatus: true,
        chantierSignaleArret: true,
        checkpoints: {
          orderBy: { createdAt: 'desc' },
          take: 2,
          select: {
            travauxBudgetInitial: true,
            travauxDepensesADate: true,
            prixVenteInitialPrevu: true,
            prixVenteActualise: true,
            prixVenteReelADate: true,
            pourcentageVendu: true,
            commercialisationLancee: true,
            createdAt: true,
          },
        },
        guarantees: { where: { status: 'ACTIVE' }, select: { type: true, endDate: true, verifiedAt: true, amount: true, rank: true } },
        repayments: { where: { projected: false }, select: { amount: true, projected: true } },
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const now = new Date();
    const closed = isDealClosed(deal);
    const previousScore = deal.riskScore ?? null;
    const cycleProjet = computeCycleProjet(deal.stage, deal.repaid);

    if (closed) {
      if (persist) {
        // Capturé une seule fois, au tout premier passage en dossier clos —
        // c'est le seul point où le "dernier score composite connu avant
        // clôture" est encore disponible avant d'être effacé ci-dessous.
        const captureAtClosure = deal.riskScoreAtClosure === null && previousScore !== null;
        await this.prisma.deal.update({
          where: { id: dealId },
          data: {
            riskScore: null,
            riskScorePrevious: null,
            riskScoreUpdatedAt: now,
            qualityScore: null,
            performanceScore: null,
            ewsScore: null,
            surveillanceStatus: null,
            ...(captureAtClosure ? { riskScoreAtClosure: previousScore, riskScoreAtClosureDate: now } : {}),
          },
        });
      }
      return {
        dealId,
        suppressed: true,
        computedAt: now.toISOString(),
        disclaimer: DISCLAIMER,
        composite: { score: null, previousScore: null, trend: null, deltas: { d7: null, d30: null, d90: null } },
        triggered: [],
        surveillance: { status: null, automaticStatus: null, velocity: null, hardOverrides: [], analystOverride: null },
        cycleProjet,
        recoveryStatus: deal.recoveryStatus,
        completeness: null,
        dataFreshness: null,
        guaranteeProtection: '',
      };
    }

    // ── Données transverses ────────────────────────────────────────────
    const [financial, bpComparison, activeDealOverride] = await Promise.all([
      this.financialModel.get(organizationId, dealId),
      this.financialModel.getBpComparison(organizationId, dealId),
      this.prisma.dealOverride.findFirst({ where: { dealId, active: true }, include: { createdBy: { select: { firstName: true, lastName: true } } } }),
    ]);

    const rawCheckpoints: RawCheckpoint[] = deal.checkpoints;
    const latestRaw = rawCheckpoints[0] ?? null;
    const previousRaw = rawCheckpoints[1] ?? null;

    const checkpointHealth = computeCheckpointHealth(
      latestRaw
        ? {
            travauxBudgetInitial: num(latestRaw.travauxBudgetInitial),
            travauxDepensesADate: num(latestRaw.travauxDepensesADate),
            prixVenteInitialPrevu: num(latestRaw.prixVenteInitialPrevu),
            prixVenteReelADate: num(latestRaw.prixVenteReelADate),
            createdAt: latestRaw.createdAt,
          }
        : null,
    );

    const toCheckpointFields = (c: RawCheckpoint | null): CheckpointFields | null =>
      c
        ? {
            travauxBudgetInitial: num(c.travauxBudgetInitial),
            travauxDepensesADate: num(c.travauxDepensesADate),
            prixVenteInitialPrevu: num(c.prixVenteInitialPrevu),
            prixVenteReelADate: num(c.prixVenteReelADate),
            pourcentageVendu: c.pourcentageVendu,
            commercialisationLancee: c.commercialisationLancee,
          }
        : null;

    const deltaPrixActualisePct = latestRaw ? pctDelta(num(latestRaw.prixVenteInitialPrevu), num(latestRaw.prixVenteActualise)) : null;
    const daysSinceLastCheckpoint = latestRaw ? Math.floor((now.getTime() - latestRaw.createdAt.getTime()) / DAY_MS) : null;

    const deadlineAlert = computeDeadlineAlert(deal.dateMax, now, false);
    const durationTargetAlert = computeDurationTargetAlert(deal.startDate, deal.durationMonths, now, false);
    const newsletter = computeNewsletterStatus(deal.lastNewsletterDate, deal.newsletterTargetDays, now);

    const environmentHazardCount = (() => {
      if (deal.lat === null || deal.lng === null) return null;
      const cached = this.riskData.peekCached(Number(deal.lat), Number(deal.lng));
      if (!cached) return null;
      return [cached.floodZone?.present, cached.seismicZone?.present].filter((p) => p === true).length;
    })();

    // ── Garanties : comptage par sûreté, couverture rang 1, planchers critiques ────
    const amountRaised = Number(deal.amountRaised);
    const crd = computeCrd(amountRaised, sumRealizedRepayments(deal.repayments));
    let guaranteeNonValideCount = 0;
    let guaranteeExpireBientotCount = 0;
    let hasCriticalExpiredGuarantee = false;
    let hasOtherExpiredGuarantee = false;
    let rank1Sum = 0;

    for (const g of deal.guarantees) {
      if (g.rank === 1) rank1Sum += Number(g.amount);
      const expiry = computeGuaranteeExpiry(g.type, g.endDate, now, false);
      if (expiry.validity === 'NON_VALIDE') {
        guaranteeNonValideCount += 1;
        const sharePct = amountRaised > 0 ? Number(g.amount) / amountRaised : 0;
        if (g.rank === 1 && sharePct >= 0.5) hasCriticalExpiredGuarantee = true;
        else hasOtherExpiredGuarantee = true;
      } else if (expiry.expiringSoon) {
        guaranteeExpireBientotCount += 1;
      }
    }
    // Couverture de l'exposition RESTANTE (CRD), pas du montant historique
    // collecté — une garantie qui couvrait 60% au jour 0 en couvre
    // mécaniquement une part croissante à mesure que le capital est
    // remboursé. crd === 0 sur un dossier encore ouvert (cas limite non
    // attendu, ex. données de remboursement incohérentes) : donnée non
    // pertinente, ni division par zéro ni 100% artificiel.
    const guaranteeCoverageRatio = crd > 0 ? rank1Sum / crd : null;

    // ── Entrées financières (marge structurelle, dépendance bancaire) ───
    const synthesis = financial.synthesis;
    let marginPctForScoring: number | null = null;
    if (synthesis) {
      if (bpComparison.locked) {
        const margeLine = bpComparison.lines.find((l) => l.key === 'marge') as { initialPct?: number } | undefined;
        marginPctForScoring = margeLine?.initialPct ?? synthesis.margePct;
      } else {
        marginPctForScoring = synthesis.margePct;
      }
    }
    const bank = synthesis?.bank;
    const bankFinancingEnabled = bank?.enabled ?? false;
    let bankLoanShare: number | null = null;
    if (synthesis && bank?.enabled === true) {
      const bankLoanTotal = Number((bank as { loanTotal?: number }).loanTotal ?? 0);
      const total = synthesis.lpb.collecte + bankLoanTotal;
      bankLoanShare = total > 0 ? bankLoanTotal / total : null;
    }

    // ── Score additif unique (A.2, spec "Le Traçotin" v2) ────────────────
    const { score: composite, triggered } = computeRiskScore({
      deadlineAlert,
      durationTargetAlert,
      latestCheckpoint: toCheckpointFields(latestRaw),
      previousCheckpoint: toCheckpointFields(previousRaw),
      daysSinceLastCheckpoint,
      guaranteeNonValideCount,
      guaranteeExpireBientotCount,
      recoveryStatus: deal.recoveryStatus,
      porteurMonitoringStatus: deal.porteurMonitoringStatus,
      chantierSignaleArret: deal.chantierSignaleArret,
      marginAlert: bpComparison.marginAlert,
      bpLocked: bpComparison.locked,
      checkpointHealthLevel: checkpointHealth.level,
      deltaPrixActualisePct,
      newsletterStatus: newsletter.status,
      environmentHazardCount,
      marginPct: marginPctForScoring,
      ltc: synthesis?.ratios.ltc ?? null,
      ltv: synthesis?.ratios.ltv ?? null,
      bankFinancingEnabled,
      bankLoanShare,
      guaranteeCoverageRatio,
    });

    // ── Hard overrides + override analyste + historique/vélocité ────────
    const overrideEval = await this.riskOverrides.evaluate(organizationId, dealId, deal.name, deal.reference, {
      porteurMonitoringStatus: deal.porteurMonitoringStatus,
      recoveryStatus: deal.recoveryStatus,
      deadlineStage: deadlineAlert.stage,
      repaid: deal.repaid,
      stage: deal.stage,
      chantierSignaleArret: deal.chantierSignaleArret,
      hasCriticalExpiredGuarantee,
      hasOtherExpiredGuarantee,
      hasDurationOverdue: durationTargetAlert.stage === 'DEPASSEE',
    });

    const deltas = await this.riskHistory.getDeltas(dealId, composite, now);
    const velocity = classifyVelocity(deltas.d90);

    const classification = classifySurveillanceStatus({
      compositeScore: composite,
      velocity,
      activeHardOverrideFloors: overrideEval.floors,
      analystOverrideStatus: activeDealOverride?.overrideStatus ?? null,
    });

    const trend: 'UP' | 'DOWN' | 'FLAT' = previousScore === null || previousScore === composite ? 'FLAT' : previousScore < composite ? 'UP' : 'DOWN';

    const topTriggered = [...triggered].sort((a, b) => b.points - a.points);

    if (persist) {
      await this.prisma.deal.update({
        where: { id: dealId },
        data: {
          qualityScore: null,
          performanceScore: null,
          ewsScore: null,
          riskScorePrevious: previousScore,
          riskScore: composite,
          riskScoreUpdatedAt: now,
          surveillanceStatus: classification.finalStatus,
        },
      });

      await this.riskHistory.maybeSnapshot(
        organizationId,
        dealId,
        {
          compositeScore: composite,
          surveillanceStatus: classification.finalStatus,
          breakdown: {
            triggered,
            hardOverrides: overrideEval.active.map((o) => o.ruleKey),
            analystOverride: activeDealOverride?.overrideStatus ?? null,
          } as unknown as Prisma.InputJsonValue,
        },
        trigger,
      );

      await this.maybeAlert(organizationId, deal, deal.surveillanceStatus, classification.finalStatus, previousScore, composite, topTriggered);
    }

    const procedureCollectiveInstance = await this.prisma.playbookInstance.findFirst({
      where: { dealId, eventType: 'PROCEDURE_COLLECTIVE_OUVERTE' },
      include: { actions: { select: { key: true, task: { select: { done: true } } } } },
    });
    const procedureCollective = procedureCollectiveInstance
      ? {
          typeIdentified: procedureCollectiveInstance.actions.find((a) => a.key === 'identifier_type_procedure')?.task.done ?? false,
          declarationCreanceFaite: procedureCollectiveInstance.actions.find((a) => a.key === 'declaration_creance')?.task.done ?? false,
        }
      : null;

    const completeness = computeCompleteness({
      hasFinancialModel: synthesis !== null,
      bpLocked: bpComparison.locked,
      daysSinceLastCheckpoint,
      porteurSiren: deal.porteurSiren,
      porteurMonitoringStatus: deal.porteurMonitoringStatus,
      guarantees: deal.guarantees,
      procedureCollective,
    });

    const dataFreshness = computeDataFreshness({
      hasSiren: deal.porteurSiren !== null,
      porteurCheckedAt: deal.porteurCheckedAt,
      hasCoords: deal.lat !== null && deal.lng !== null,
      riskDataCheckedAt: deal.riskDataCheckedAt,
      hasPostcode: deal.postcode !== null,
      dpeCheckedAt: deal.dpeCheckedAt,
    });

    return {
      dealId,
      suppressed: false,
      computedAt: now.toISOString(),
      disclaimer: DISCLAIMER,
      composite: { score: composite, previousScore, trend: previousScore === null ? null : trend, deltas },
      triggered: topTriggered,
      surveillance: {
        status: classification.finalStatus,
        automaticStatus: classification.automaticStatus,
        velocity: { band: velocity.band, direction: velocity.direction, delta90: velocity.delta },
        hardOverrides: overrideEval.active.map((o) => ({ ruleKey: o.ruleKey, label: o.label, minimumSurveillanceStatus: o.minimumSurveillanceStatus, triggeredAt: o.triggeredAt.toISOString() })),
        analystOverride: activeDealOverride
          ? {
              overrideStatus: activeDealOverride.overrideStatus,
              justification: activeDealOverride.justification,
              createdAt: activeDealOverride.createdAt.toISOString(),
              createdByName: `${activeDealOverride.createdBy.firstName} ${activeDealOverride.createdBy.lastName}`,
            }
          : null,
      },
      cycleProjet,
      recoveryStatus: deal.recoveryStatus,
      completeness,
      dataFreshness,
      guaranteeProtection: describeGuaranteeCoverage(guaranteeCoverageRatio),
    };
  }

  /** Méthodologie exposée en clair — lue depuis les mêmes sources que le calcul réel, jamais dupliquée. */
  getMethodology() {
    return {
      indicators: RISK_INDICATOR_DEFINITIONS,
      surveillanceBands: {
        FAIBLE: '0 à 25',
        SOUS_SURVEILLANCE: '26 à 50',
        ELEVE: '51 à 100 (score seul) — ou en dessous en cas d\'escalade vélocité',
        CRITIQUE: 'jamais par le score seul — uniquement via un plancher dur (voir hardOverrideRules)',
      },
      velocityWindowDays: 90,
      velocityBands: { STABLE: '0 à 3', DETERIORATION: '4 à 8', DERIVE: '9 à 15', DETERIORATION_RAPIDE: '> 15' },
      hardOverrideRules: HARD_OVERRIDE_RULES.map((r) => ({ key: r.key, label: r.label, minimumSurveillanceStatus: r.minimumSurveillanceStatus })),
      calibrationDisclaimer: METHODOLOGY_DISCLAIMER,
      disclaimer: DISCLAIMER,
    };
  }

  /**
   * Validation rétrospective : rapproche le dernier score composite connu de
   * chaque dossier clos (riskScoreAtClosure) de son résultat réel (REMBOURSE
   * vs DEFAUT). Inchangée depuis la Phase 1 — toujours construite à partir de
   * données 100% réelles.
   */
  async getModelValidation(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, riskScoreAtClosure: { not: null } },
      select: { id: true, reference: true, name: true, stage: true, riskScoreAtClosure: true, riskScoreAtClosureDate: true },
    });

    const outcomeOf = (stage: string): 'REMBOURSE' | 'DEFAUT' => (stage === 'DEFAUT' ? 'DEFAUT' : 'REMBOURSE');

    const tierOf = (score: number): 'SAFE' | 'WATCH' | 'HIGH' => (score >= 70 ? 'HIGH' : score >= 40 ? 'WATCH' : 'SAFE');

    const summarize = (scores: number[]) => {
      if (scores.length === 0) return { count: 0, averageScore: null as number | null, medianScore: null as number | null, tierDistribution: { SAFE: 0, WATCH: 0, HIGH: 0 } };
      const sorted = [...scores].sort((a, b) => a - b);
      const tierDistribution = { SAFE: 0, WATCH: 0, HIGH: 0 };
      for (const s of scores) tierDistribution[tierOf(s)] += 1;
      return {
        count: scores.length,
        averageScore: Math.round(scores.reduce((sum, v) => sum + v, 0) / scores.length),
        medianScore: sorted[Math.floor(sorted.length / 2)],
        tierDistribution,
      };
    };

    const scoresByOutcome: Record<'REMBOURSE' | 'DEFAUT', number[]> = { REMBOURSE: [], DEFAUT: [] };
    for (const d of deals) scoresByOutcome[outcomeOf(d.stage)].push(d.riskScoreAtClosure!);

    return {
      totalCount: deals.length,
      sampleTooSmall: deals.length < 10,
      outcomes: {
        REMBOURSE: summarize(scoresByOutcome.REMBOURSE),
        DEFAUT: summarize(scoresByOutcome.DEFAUT),
      },
      cases: deals
        .map((d) => ({
          dealId: d.id,
          reference: d.reference,
          name: d.name,
          outcome: outcomeOf(d.stage),
          scoreAtClosure: d.riskScoreAtClosure!,
          closureDate: d.riskScoreAtClosureDate!.toISOString(),
        }))
        .sort((a, b) => b.closureDate.localeCompare(a.closureDate)),
    };
  }

  // ── Alerte ────────────────────────────────────────────────────────────

  private async maybeAlert(
    organizationId: string,
    deal: { id: string; reference: string; name: string; amountRaised: unknown },
    previousStatus: DealSurveillanceStatus | null,
    newStatus: DealSurveillanceStatus,
    previousScore: number | null,
    newScore: number,
    topContributors: { label: string; points: number }[],
  ) {
    if (previousStatus === null) return; // premier calcul, ou dossier tout juste réactivé — rien à comparer

    const dateSuffix = new Date().toLocaleDateString('fr-FR');
    const exposition = `${Number(deal.amountRaised).toLocaleString('fr-FR')} €`;
    const topLabels = topContributors.slice(0, 2).map((c) => c.label).join(' et ');

    let title: string | null = null;
    let message: string | null = null;
    let severity: 'WARNING' | 'CRITICAL' = 'WARNING';

    if (SURVEILLANCE_RANK[newStatus] > SURVEILLANCE_RANK[previousStatus]) {
      title = `Risque : entrée en zone ${newStatus} — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : statut passé de ${previousStatus} à ${newStatus}, score de ${previousScore ?? '—'} à ${newScore}/100${topLabels ? `, tiré par ${topLabels}` : ''}.`;
      severity = newStatus === 'CRITIQUE' ? 'CRITICAL' : 'WARNING';
    } else if (SURVEILLANCE_RANK[newStatus] < SURVEILLANCE_RANK[previousStatus]) {
      title = `Risque : retour en zone ${newStatus} — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : statut redescendu de ${previousStatus} à ${newStatus}.`;
      severity = 'WARNING';
    } else if (previousScore !== null && Math.abs(newScore - previousScore) >= 15) {
      title = `Risque : mouvement significatif — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : score composite passé de ${previousScore} à ${newScore}/100${topLabels ? `, tiré par ${topLabels}` : ''}.`;
      severity = 'WARNING';
    }

    if (!title || !message) return;

    const existing = await this.prisma.alert.findFirst({ where: { organizationId, dealId: deal.id, title } });
    if (existing) return;

    await this.alerts.create(organizationId, { title, message, severity, dealId: deal.id });
  }
}

function computeCycleProjet(stage: string, repaid: boolean): 'EN_COURS' | 'SORTIE' | 'REMBOURSEMENT' | 'CLOTURE' {
  if (stage === 'DEFAUT') return 'CLOTURE';
  if (stage === 'REMBOURSE' && repaid) return 'CLOTURE';
  if (stage === 'REMBOURSE' || repaid) return 'REMBOURSEMENT';
  if (stage === 'SUIVI') return 'SORTIE';
  return 'EN_COURS';
}
