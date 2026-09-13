import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FractionalProjectsService } from './fractional-projects.service';
import { computeFitAssessment, type ScoreCategoryInput } from './weighted-score.util';
import type { EliminatoryMetricKey, EliminatoryMetricsInput, EliminatoryRuleInput } from './eliminatory-rule.util';
import { CreateScoreCategoryDto } from './dto/create-score-category.dto';
import { CreateScoreCriterionDto } from './dto/create-score-criterion.dto';
import { CreateScoreBucketDto } from './dto/create-score-bucket.dto';
import { CreateEliminatoryRuleDto } from './dto/create-eliminatory-rule.dto';
import { SubmitScoreAssessmentDto } from './dto/submit-score-assessment.dto';

/**
 * Weighted Scoring Engine + Eliminatory Rules (Complément H, points 1/8).
 * Le barème (catégories/critères/buckets) et les règles éliminatoires sont
 * PARTAGÉS au niveau organisation — même doctrine que MarketDataService
 * (RentIndexSeries/MarketComparablePool, patch V3.2 §2) : jamais ressaisis
 * par dossier. Chaque FractionalScoreAssessment est en revanche propre à un
 * projet et append-only (comme FractionalICDecision).
 */
@Injectable()
export class FitScoringService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly projectsService: FractionalProjectsService,
  ) {}

  // ── Barème — catégories / critères / buckets ────────────────────────

  listCategories(user: AuthenticatedUser, assetType?: string) {
    return this.prisma.fractionalScoreCategory.findMany({
      where: { organizationId: user.organizationId, ...(assetType !== undefined ? { assetType } : {}) },
      include: { criteria: { include: { buckets: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createCategory(dto: CreateScoreCategoryDto, user: AuthenticatedUser) {
    return this.prisma.fractionalScoreCategory.create({
      data: { organizationId: user.organizationId, assetType: dto.assetType ?? null, label: dto.label, maxPoints: dto.maxPoints, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async removeCategory(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.fractionalScoreCategory.findUnique({ where: { id } });
    if (!row || row.organizationId !== user.organizationId) throw new NotFoundException('Catégorie non trouvée');
    await this.prisma.fractionalScoreCategory.delete({ where: { id } });
  }

  async createCriterion(dto: CreateScoreCriterionDto, user: AuthenticatedUser) {
    const category = await this.prisma.fractionalScoreCategory.findUnique({ where: { id: dto.categoryId } });
    if (!category || category.organizationId !== user.organizationId) throw new NotFoundException('Catégorie non trouvée');
    return this.prisma.fractionalScoreCriterion.create({
      data: { categoryId: dto.categoryId, label: dto.label, sourceField: dto.sourceField ?? null, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async removeCriterion(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.fractionalScoreCriterion.findUnique({ where: { id }, include: { category: true } });
    if (!row || row.category.organizationId !== user.organizationId) throw new NotFoundException('Critère non trouvé');
    await this.prisma.fractionalScoreCriterion.delete({ where: { id } });
  }

  async createBucket(dto: CreateScoreBucketDto, user: AuthenticatedUser) {
    const criterion = await this.prisma.fractionalScoreCriterion.findUnique({ where: { id: dto.criterionId }, include: { category: true } });
    if (!criterion || criterion.category.organizationId !== user.organizationId) throw new NotFoundException('Critère non trouvé');
    return this.prisma.fractionalScoreBucket.create({
      data: { criterionId: dto.criterionId, label: dto.label, points: dto.points, isEliminatory: dto.isEliminatory ?? false, sortOrder: dto.sortOrder ?? 0 },
    });
  }

  async removeBucket(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.fractionalScoreBucket.findUnique({ where: { id }, include: { criterion: { include: { category: true } } } });
    if (!row || row.criterion.category.organizationId !== user.organizationId) throw new NotFoundException('Réponse non trouvée');
    await this.prisma.fractionalScoreBucket.delete({ where: { id } });
  }

  // ── Règles éliminatoires ─────────────────────────────────────────────

  listEliminatoryRules(user: AuthenticatedUser, assetType?: string) {
    return this.prisma.fractionalEliminatoryRule.findMany({
      where: { organizationId: user.organizationId, ...(assetType !== undefined ? { assetType } : {}) },
      orderBy: { sortOrder: 'asc' },
    });
  }

  async createEliminatoryRule(dto: CreateEliminatoryRuleDto, user: AuthenticatedUser) {
    if (dto.platformProfileId) {
      const profile = await this.prisma.platformFractionalProfile.findUnique({ where: { id: dto.platformProfileId } });
      if (!profile || profile.organizationId !== user.organizationId) throw new NotFoundException('Profil plateforme non trouvé');
    }
    return this.prisma.fractionalEliminatoryRule.create({
      data: {
        organizationId: user.organizationId,
        assetType: dto.assetType ?? null,
        platformProfileId: dto.platformProfileId ?? null,
        label: dto.label,
        metricKey: dto.metricKey,
        operator: dto.operator,
        threshold: dto.threshold,
        failMessage: dto.failMessage,
        sortOrder: dto.sortOrder ?? 0,
      },
    });
  }

  async removeEliminatoryRule(id: string, user: AuthenticatedUser) {
    const row = await this.prisma.fractionalEliminatoryRule.findUnique({ where: { id } });
    if (!row || row.organizationId !== user.organizationId) throw new NotFoundException('Règle non trouvée');
    await this.prisma.fractionalEliminatoryRule.delete({ where: { id } });
  }

  // ── Résolution du barème applicable à un projet ─────────────────────

  /**
   * Un barème spécifique à l'assetType du projet prévaut s'il existe ;
   * sinon repli sur le barème générique (assetType null) — jamais les deux
   * mélangés (ça doublerait les points). Même logique pour les règles
   * éliminatoires : une règle s'applique si sa contrainte assetType (le cas
   * échéant) correspond ET sa contrainte plateforme (le cas échéant)
   * correspond — absente des deux côtés = contrainte non posée, ne bloque
   * jamais la correspondance.
   */
  async getBaremeForProject(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({
      where: { id: projectId, organizationId: user.organizationId },
      select: { assetType: true, vehicleStructure: { select: { platformProfileId: true } } },
    });
    if (!project) throw new NotFoundException('Dossier non trouvé');

    let resolvedAssetType: string | null = null;
    if (project.assetType) {
      const specificExists = await this.prisma.fractionalScoreCategory.findFirst({
        where: { organizationId: user.organizationId, assetType: project.assetType },
      });
      resolvedAssetType = specificExists ? project.assetType : null;
    }

    const categories = await this.prisma.fractionalScoreCategory.findMany({
      where: { organizationId: user.organizationId, assetType: resolvedAssetType },
      include: { criteria: { include: { buckets: { orderBy: { sortOrder: 'asc' } } }, orderBy: { sortOrder: 'asc' } } },
      orderBy: { sortOrder: 'asc' },
    });

    const platformProfileId = project.vehicleStructure?.platformProfileId ?? null;
    const allRules = await this.prisma.fractionalEliminatoryRule.findMany({ where: { organizationId: user.organizationId }, orderBy: { sortOrder: 'asc' } });
    const eliminatoryRules = allRules.filter(
      (r) => (r.assetType === null || r.assetType === project.assetType) && (r.platformProfileId === null || r.platformProfileId === platformProfileId),
    );

    return { resolvedAssetType, categories, eliminatoryRules };
  }

  // ── Passage au barème pour un projet ─────────────────────────────────

  async computeAndSaveAssessment(projectId: string, dto: SubmitScoreAssessmentDto, user: AuthenticatedUser) {
    const { categories, eliminatoryRules } = await this.getBaremeForProject(projectId, user);
    const synthese = await this.projectsService.computeSynthese(projectId, user);

    const categoryInputs: ScoreCategoryInput[] = categories.map((c) => ({
      id: c.id,
      label: c.label,
      maxPoints: Number(c.maxPoints),
      criteria: c.criteria.map((crit) => ({ id: crit.id, label: crit.label, buckets: crit.buckets.map((b) => ({ id: b.id, points: Number(b.points) })) })),
    }));

    const ruleInputs: EliminatoryRuleInput[] = eliminatoryRules.map((r) => ({
      id: r.id,
      label: r.label,
      metricKey: r.metricKey as EliminatoryMetricKey,
      operator: r.operator,
      threshold: Number(r.threshold),
      failMessage: r.failMessage,
    }));

    const metrics: EliminatoryMetricsInput = {
      securedNetYieldPct: synthese.base.securedNetYieldPct,
      investorNetYieldPct: synthese.base.investorNetYieldPct,
      grossYieldPct: synthese.base.grossYieldPct,
      walbYears: synthese.base.leaseSecurity.walbYears,
      waltYears: synthese.base.leaseSecurity.waltYears,
      irrPct: synthese.base.irrPct,
      equityMultiple: synthese.base.equityMultiple,
      sourcesUsesBalanced: synthese.base.sourcesUsesResult.balanced,
    };

    const result = computeFitAssessment(categoryInputs, dto.answers, ruleInputs, metrics);

    const assessment = await this.prisma.fractionalScoreAssessment.create({
      data: {
        projectId,
        scoredById: user.id,
        totalPoints: result.score.totalPoints,
        maxPoints: result.score.maxPoints,
        categoryBreakdown: result.score.categoryBreakdown as unknown as Prisma.InputJsonValue,
        eliminatoryResults: result.eliminatoryResults as unknown as Prisma.InputJsonValue,
        finalVerdict: result.finalVerdict,
        answers: { create: dto.answers.map((a) => ({ criterionId: a.criterionId, bucketId: a.bucketId })) },
      },
      include: { answers: true },
    });

    return { assessment, result };
  }

  async getLatestAssessment(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId }, select: { id: true } });
    if (!project) throw new NotFoundException('Dossier non trouvé');
    return this.prisma.fractionalScoreAssessment.findFirst({
      where: { projectId },
      orderBy: { scoredAt: 'desc' },
      include: { answers: true },
    });
  }
}
