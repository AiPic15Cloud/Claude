import { Injectable, Logger, NotFoundException, OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { AlertsService } from '../alerts/alerts.service';
import { RiskDataService } from '../risk-data/risk-data.service';
import { isDealClosed } from '../common/deal-lifecycle.util';
import { computeDeadlineAlert } from '../deals/deadline.util';
import { computeCheckpointHealth } from '../deals/checkpoint-health.util';
import { computeGuaranteeExpiry } from '../guarantees/guarantee-expiry.util';
import { computeNewsletterStatus } from '../deals/newsletter.util';
import { riskTier, tierRank, type RiskTier } from './risk-tier.util';
import { FACTOR_DEFINITIONS, METHODOLOGY_DISCLAIMER, factorWeight } from './factor-definitions';

export interface RiskFactor {
  key: string;
  label: string;
  /** 0-100, niveau de risque (0 = aucun risque, 100 = risque maximal) */
  value: number;
  /** Part du score final, 0-1 */
  weight: number;
  contribution: number;
  explanation: string;
}

export interface RiskBreakdown {
  dealId: string;
  score: number | null;
  previousScore: number | null;
  tier: RiskTier | null;
  trend: 'UP' | 'DOWN' | 'FLAT' | null;
  factors: RiskFactor[];
  computedAt: string;
  suppressed: boolean;
  disclaimer: string;
}

const DISCLAIMER =
  'Risk Engine ATLAS — score de risque propriétaire, calculé de façon transparente à partir des données du dossier. ' +
  "Ce n'est pas une notation financière officielle et ne remplace pas le jugement d'un analyste.";

const CHECK_INTERVAL_MS = 6 * 60 * 60_000;

// Exportés pour réutilisation par DealsService.buildNarrative() — même
// texte que les explications de facteur du Risk Engine, pas de nouvelle
// rédaction pour la synthèse narrative d'Opération 360°.
export const RECOVERY_LABEL: Record<string, string> = {
  SAIN: 'Recouvrement sain, aucun signal.',
  EN_RETARD: 'Échéance dépassée sans réaction du porteur.',
  PRE_CONTENTIEUX: 'Mise en demeure envoyée, pas encore de procédure.',
  PROCEDURE: 'Action judiciaire engagée.',
};

export const PORTEUR_LABEL: Record<string, string> = {
  actif: 'Statut administratif actif.',
  fermee: 'Société fermée/radiée.',
  procedure_collective: 'Procédure collective en cours.',
};

/**
 * Score de risque dynamique (0-100, 100 = risque maximal) par dossier —
 * recalculé automatiquement à chaque événement pertinent (checkpoint,
 * garantie, recouvrement, échéance, surveillance société) en plus d'un
 * filet de sécurité périodique, plutôt que sur un simple timer comme le
 * reste des connecteurs "computed status" du codebase.
 *
 * Chaque facteur réutilise une fonction pure déjà en production
 * (computeDeadlineAlert, computeCheckpointHealth, computeGuaranteeExpiry,
 * computeNewsletterStatus) plutôt que d'inventer une nouvelle logique de
 * risque — même niveau d'auditabilité que Score ATLAS, sémantique inversée
 * (ici, haut = mauvais).
 */
@Injectable()
export class RiskEngineService implements OnApplicationBootstrap {
  private readonly logger = new Logger(RiskEngineService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly alerts: AlertsService,
    private readonly riskData: RiskDataService,
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
        const before = await this.prisma.deal.findUnique({ where: { id: deal.id }, select: { riskScore: true } });
        const breakdown = await this.computeDealRisk(deal.organizationId, deal.id, true);
        if (before?.riskScore !== breakdown.score) alerted += breakdown.score !== null ? 1 : 0;
      } catch (err) {
        this.logger.error(`Échec du calcul de risque pour le deal ${deal.id}`, err instanceof Error ? err.stack : err);
      }
    }
    if (alerted > 0) this.logger.log(`Risk Engine : ${alerted} dossier(s) recalculé(s) avec un score modifié.`);
  }

  /** Utilisé par les déclencheurs événementiels (checkpoint, garantie, recouvrement, surveillance société). */
  async recomputeAndPersist(organizationId: string, dealId: string): Promise<void> {
    await this.computeDealRisk(organizationId, dealId, true);
  }

  async computeDealRisk(organizationId: string, dealId: string, persist = false): Promise<RiskBreakdown> {
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
        recoveryStatus: true,
        porteurMonitoringStatus: true,
        lastNewsletterDate: true,
        newsletterTargetDays: true,
        lat: true,
        lng: true,
        riskScore: true,
        riskScorePrevious: true,
        riskScoreAtClosure: true,
        checkpoints: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: {
            travauxBudgetInitial: true,
            travauxDepensesADate: true,
            prixVenteInitialPrevu: true,
            prixVenteReelADate: true,
            createdAt: true,
          },
        },
        guarantees: { where: { status: 'ACTIVE' }, select: { type: true, endDate: true } },
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const now = new Date();
    const closed = isDealClosed(deal);
    const previousScore = deal.riskScore ?? null;

    if (closed) {
      if (persist) {
        // Capturé une seule fois, au tout premier passage en dossier clos —
        // c'est le seul point où le "dernier score connu avant clôture" est
        // encore disponible (previousScore) avant d'être effacé ci-dessous.
        // Alimente la validation rétrospective du modèle (getModelValidation)
        // avec des cas réels plutôt qu'un historique fabriqué.
        const captureAtClosure = deal.riskScoreAtClosure === null && previousScore !== null;
        await this.prisma.deal.update({
          where: { id: dealId },
          data: {
            riskScore: null,
            riskScorePrevious: null,
            riskScoreUpdatedAt: now,
            ...(captureAtClosure ? { riskScoreAtClosure: previousScore, riskScoreAtClosureDate: now } : {}),
          },
        });
      }
      return {
        dealId,
        score: null,
        previousScore: null,
        tier: null,
        trend: null,
        factors: [],
        computedAt: now.toISOString(),
        suppressed: true,
        disclaimer: DISCLAIMER,
      };
    }

    const clamp = (v: number) => Math.max(0, Math.min(100, Math.round(v)));

    const factors: Omit<RiskFactor, 'contribution'>[] = [
      this.echeanceFactor(deal.dateMax, now),
      this.chantierFactor(deal.checkpoints[0] ?? null),
      this.recouvrementFactor(deal.recoveryStatus),
      this.porteurFactor(deal.porteurMonitoringStatus),
      this.garantiesFactor(deal.guarantees, now),
      this.newsletterFactor(deal.lastNewsletterDate, deal.newsletterTargetDays, now),
      this.environnementFactor(deal.lat !== null ? Number(deal.lat) : null, deal.lng !== null ? Number(deal.lng) : null),
    ].map((f) => ({ ...f, value: clamp(f.value) }));

    const withContribution: RiskFactor[] = factors.map((f) => ({
      ...f,
      contribution: Math.round(f.value * f.weight * 10) / 10,
    }));

    const score = Math.round(withContribution.reduce((sum, f) => sum + f.value * f.weight, 0));
    const tier = riskTier(score);
    const trend = previousScore === null || previousScore === score ? 'FLAT' : previousScore < score ? 'UP' : 'DOWN';

    if (persist) {
      await this.prisma.deal.update({
        where: { id: dealId },
        data: { riskScorePrevious: previousScore, riskScore: score, riskScoreUpdatedAt: now },
      });
      await this.maybeAlert(organizationId, deal, previousScore, score, withContribution);
    }

    return {
      dealId,
      score,
      previousScore,
      tier,
      trend: previousScore === null ? null : trend,
      factors: withContribution,
      computedAt: now.toISOString(),
      suppressed: false,
      disclaimer: DISCLAIMER,
    };
  }

  /** Méthodologie exposée en clair (poids + justification par facteur) — lue depuis la même source que le calcul réel, jamais dupliquée. */
  getMethodology() {
    return {
      factors: FACTOR_DEFINITIONS,
      calibrationDisclaimer: METHODOLOGY_DISCLAIMER,
      disclaimer: DISCLAIMER,
      tiers: { SAFE: '< 40', WATCH: '40 à 69', HIGH: '≥ 70' },
    };
  }

  /**
   * Validation rétrospective : rapproche le dernier score connu de chaque
   * dossier clos (riskScoreAtClosure, capturé une seule fois dans
   * computeDealRisk() juste avant la remise à zéro) de son résultat réel
   * (REMBOURSE vs DEFAUT). Construite à partir de données 100% réelles —
   * jamais un historique simulé — donc honnête sur sa propre faiblesse
   * statistique tant que l'effectif de dossiers clos reste faible.
   */
  async getModelValidation(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, riskScoreAtClosure: { not: null } },
      select: { id: true, reference: true, name: true, stage: true, riskScoreAtClosure: true, riskScoreAtClosureDate: true },
    });

    const outcomeOf = (stage: string): 'REMBOURSE' | 'DEFAUT' => (stage === 'DEFAUT' ? 'DEFAUT' : 'REMBOURSE');

    const summarize = (scores: number[]) => {
      if (scores.length === 0) return { count: 0, averageScore: null as number | null, medianScore: null as number | null, tierDistribution: { SAFE: 0, WATCH: 0, HIGH: 0 } };
      const sorted = [...scores].sort((a, b) => a - b);
      const tierDistribution = { SAFE: 0, WATCH: 0, HIGH: 0 };
      for (const s of scores) tierDistribution[riskTier(s)] += 1;
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

  // ── Facteurs ──────────────────────────────────────────────────────────

  private echeanceFactor(dateMax: Date | null, now: Date): Omit<RiskFactor, 'contribution'> {
    const alert = computeDeadlineAlert(dateMax, now, false);
    const value: Record<NonNullable<typeof alert.stage> | 'RAS', number> = {
      RAS: 10,
      J90: 35,
      J60: 55,
      J30: 75,
      J15: 90,
      CONTENTIEUX: 100,
    };
    return {
      key: 'echeance',
      label: 'Échéance de vote',
      weight: factorWeight('echeance'),
      value: value[alert.stage ?? 'RAS'],
      explanation: alert.actionLabel ?? 'Aucune échéance imminente.',
    };
  }

  private chantierFactor(
    checkpoint: {
      travauxBudgetInitial: unknown;
      travauxDepensesADate: unknown;
      prixVenteInitialPrevu: unknown;
      prixVenteReelADate: unknown;
      createdAt: Date;
    } | null,
  ): Omit<RiskFactor, 'contribution'> {
    if (!checkpoint) {
      return {
        key: 'chantier',
        label: 'Suivi chantier / commercialisation',
        weight: factorWeight('chantier'),
        value: 40,
        explanation: 'Aucun point de suivi chantier enregistré.',
      };
    }
    const toNumber = (v: unknown) => (v === null || v === undefined ? null : Number(v));
    const health = computeCheckpointHealth({
      travauxBudgetInitial: toNumber(checkpoint.travauxBudgetInitial),
      travauxDepensesADate: toNumber(checkpoint.travauxDepensesADate),
      prixVenteInitialPrevu: toNumber(checkpoint.prixVenteInitialPrevu),
      prixVenteReelADate: toNumber(checkpoint.prixVenteReelADate),
      createdAt: checkpoint.createdAt,
    });
    const value = health.level === 'ROUGE' ? 100 : health.level === 'ORANGE' ? 55 : health.level === 'VERT' ? 10 : 40;
    return {
      key: 'chantier',
      label: 'Suivi chantier / commercialisation',
      weight: factorWeight('chantier'),
      value,
      explanation: health.reasons.length > 0 ? health.reasons.join(' ; ') : `Suivi chantier : ${health.level ?? 'aucune donnée'}.`,
    };
  }

  private recouvrementFactor(status: string): Omit<RiskFactor, 'contribution'> {
    const value: Record<string, number> = { SAIN: 5, EN_RETARD: 50, PRE_CONTENTIEUX: 80, PROCEDURE: 100 };
    return {
      key: 'recouvrement',
      label: 'Statut de recouvrement',
      weight: factorWeight('recouvrement'),
      value: value[status] ?? 5,
      explanation: RECOVERY_LABEL[status] ?? 'Statut de recouvrement inconnu.',
    };
  }

  private porteurFactor(status: string | null): Omit<RiskFactor, 'contribution'> {
    const value: Record<string, number> = { actif: 5, fermee: 90, procedure_collective: 100 };
    return {
      key: 'porteur',
      label: 'Santé du porteur de projet',
      weight: factorWeight('porteur'),
      value: status ? (value[status] ?? 5) : 5,
      explanation: status ? (PORTEUR_LABEL[status] ?? 'Statut du porteur inconnu.') : 'SIREN non suivi.',
    };
  }

  private garantiesFactor(
    guarantees: { type: Parameters<typeof computeGuaranteeExpiry>[0]; endDate: Date | null }[],
    now: Date,
  ): Omit<RiskFactor, 'contribution'> {
    if (guarantees.length === 0) {
      return {
        key: 'garanties',
        label: 'Garanties / sûretés',
        weight: factorWeight('garanties'),
        value: 40,
        explanation: 'Aucune garantie active enregistrée.',
      };
    }

    let worstValue = 10;
    let worstExplanation = `${guarantees.length} garantie(s) valide(s), aucune échéance de renouvellement proche.`;
    for (const g of guarantees) {
      const expiry = computeGuaranteeExpiry(g.type, g.endDate, now, false);
      if (expiry.validity === 'NON_VALIDE') {
        worstValue = Math.max(worstValue, 100);
        worstExplanation = `Garantie ${g.type} expirée.`;
      } else if (expiry.expiringSoon && worstValue < 100) {
        worstValue = Math.max(worstValue, 50);
        worstExplanation = `Garantie ${g.type} expire dans ${expiry.daysToExpiry} jour(s).`;
      }
    }

    return { key: 'garanties', label: 'Garanties / sûretés', weight: factorWeight('garanties'), value: worstValue, explanation: worstExplanation };
  }

  private newsletterFactor(lastNewsletterDate: Date | null, targetDays: number, now: Date): Omit<RiskFactor, 'contribution'> {
    const { status, daysSince } = computeNewsletterStatus(lastNewsletterDate, targetDays, now);
    const value: Record<string, number> = { A_JOUR: 10, A_RELANCER: 50, CRITIQUE: 90 };
    return {
      key: 'newsletter',
      label: 'Communication investisseurs',
      weight: factorWeight('newsletter'),
      value: value[status],
      explanation:
        daysSince === null
          ? 'Aucune newsletter envoyée à ce jour.'
          : `Dernière newsletter il y a ${daysSince} jour(s) (cible : ${targetDays} jours).`,
    };
  }

  private environnementFactor(lat: number | null, lng: number | null): Omit<RiskFactor, 'contribution'> {
    if (lat === null || lng === null) {
      return {
        key: 'environnement',
        label: 'Risques environnementaux',
        weight: factorWeight('environnement'),
        value: 20,
        explanation: "Pas de coordonnées géographiques — facteur neutre.",
      };
    }
    const cached = this.riskData.peekCached(lat, lng);
    if (!cached) {
      return {
        key: 'environnement',
        label: 'Risques environnementaux',
        weight: factorWeight('environnement'),
        value: 20,
        explanation: 'Données non disponibles (onglet "Risques & urbanisme" du dossier jamais consulté) — facteur neutre.',
      };
    }
    const presentCount = [cached.floodZone?.present, cached.seismicZone?.present].filter((p) => p === true).length;
    const value = presentCount === 0 ? 10 : presentCount === 1 ? 50 : 80;
    const labels = [
      cached.floodZone?.present ? 'inondation' : null,
      cached.seismicZone?.present ? 'sismique' : null,
    ].filter((l): l is string => l !== null);
    return {
      key: 'environnement',
      label: 'Risques environnementaux',
      weight: factorWeight('environnement'),
      value,
      explanation: labels.length > 0 ? `Risque(s) identifié(s) : ${labels.join(', ')}.` : 'Aucun risque environnemental identifié.',
    };
  }

  // ── Alerte ────────────────────────────────────────────────────────────

  private async maybeAlert(
    organizationId: string,
    deal: { id: string; reference: string; name: string; amountRaised: unknown },
    previousScore: number | null,
    newScore: number,
    factors: RiskFactor[],
  ) {
    if (previousScore === null) return; // premier calcul, ou dossier tout juste réactivé — rien à comparer

    const oldTier = riskTier(previousScore);
    const newTier = riskTier(newScore);
    const dateSuffix = new Date().toLocaleDateString('fr-FR');
    const exposition = `${Number(deal.amountRaised).toLocaleString('fr-FR')} €`;
    const topFactors = [...factors]
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 2)
      .map((f) => f.label)
      .join(' et ');

    let title: string | null = null;
    let message: string | null = null;
    let severity: 'WARNING' | 'CRITICAL' = 'WARNING';

    if (tierRank(newTier) > tierRank(oldTier)) {
      title = `Risque : entrée en zone ${newTier} — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : risque passé de ${previousScore} à ${newScore}/100, tiré par ${topFactors}.`;
      severity = newTier === 'HIGH' ? 'CRITICAL' : 'WARNING';
    } else if (tierRank(newTier) < tierRank(oldTier)) {
      title = `Risque : retour en zone ${newTier} — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : risque redescendu de ${previousScore} à ${newScore}/100.`;
      severity = 'WARNING';
    } else if (Math.abs(newScore - previousScore) >= 15) {
      title = `Risque : mouvement significatif — ${deal.reference} (${dateSuffix})`;
      message = `${deal.name} (${exposition}) : risque passé de ${previousScore} à ${newScore}/100, tiré par ${topFactors}.`;
      severity = 'WARNING';
    }

    if (!title || !message) return;

    const existing = await this.prisma.alert.findFirst({ where: { organizationId, dealId: deal.id, title } });
    if (existing) return;

    await this.alerts.create(organizationId, { title, message, severity, dealId: deal.id });
  }
}
