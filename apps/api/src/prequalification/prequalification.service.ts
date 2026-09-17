import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { computePrequalFinancials, type PrequalCostLineItemInput, type PrequalLotInput } from './prequal-financial.util';
import { evaluatePrequalFinancialFindings } from './prequal-rules.util';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { UpsertProjectProfileDto } from './dto/upsert-project-profile.dto';
import { UpsertFinancialModelDto } from './dto/upsert-financial-model.dto';
import { UpsertPersonDto } from './dto/upsert-person.dto';
import { UpsertCompanyDto } from './dto/upsert-company.dto';
import { UpsertLotDto } from './dto/upsert-lot.dto';
import { UpsertTimelineDto } from './dto/upsert-timeline.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { ReviewFindingDto } from './dto/review-finding.dto';
import { CreateDecisiveQuestionDto, AnswerDecisiveQuestionDto } from './dto/create-decisive-question.dto';
import { CreateDocumentRequestDto, UpdateDocumentRequestDto } from './dto/create-document-request.dto';

const num = (value: { toNumber(): number } | null | undefined): number | null => (value != null ? Number(value) : null);

const CASE_DETAIL_INCLUDE = {
  people: true,
  companies: true,
  project: true,
  financial: { include: { costLineItems: { orderBy: { sortOrder: 'asc' as const } } } },
  planning: true,
  lots: { orderBy: { sortOrder: 'asc' as const } },
  documents: true,
  evidence: true,
  findings: { orderBy: { createdAt: 'desc' as const } },
  questions: { orderBy: { createdAt: 'desc' as const } },
  requests: true,
  assignedAnalyst: { select: { id: true, firstName: true, lastName: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true } },
};

@Injectable()
export class PrequalificationService {
  constructor(private readonly prisma: PrismaService) {}

  /** Vérifie l'appartenance du dossier à l'organisation — mêmes garde-fous que le reste du dépôt (jamais de fuite cross-org). */
  private async getOwnedCase(organizationId: string, caseId: string) {
    const found = await this.prisma.prequalificationCase.findFirst({ where: { id: caseId, organizationId } });
    if (!found) throw new NotFoundException('Dossier de préqualification introuvable.');
    return found;
  }

  async create(organizationId: string, userId: string, dto: CreateCaseDto) {
    return this.prisma.prequalificationCase.create({
      data: {
        organizationId,
        name: dto.name,
        entryChannel: dto.entryChannel,
        introducer: dto.introducer,
        projectType: dto.projectType,
        assignedAnalystId: dto.assignedAnalystId ?? userId,
        createdById: userId,
      },
    });
  }

  async list(organizationId: string, filters: { status?: string; assignedAnalystId?: string }) {
    return this.prisma.prequalificationCase.findMany({
      where: {
        organizationId,
        status: filters.status as never,
        assignedAnalystId: filters.assignedAnalystId,
      },
      orderBy: { updatedAt: 'desc' },
      include: {
        assignedAnalyst: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { findings: true, documents: true } },
      },
    });
  }

  async getById(organizationId: string, caseId: string) {
    const found = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: CASE_DETAIL_INCLUDE,
    });
    if (!found) throw new NotFoundException('Dossier de préqualification introuvable.');
    return found;
  }

  async update(organizationId: string, caseId: string, dto: UpdateCaseDto) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalificationCase.update({ where: { id: caseId }, data: dto });
  }

  // ── Profil projet (1:1, upsert) ──

  async upsertProjectProfile(organizationId: string, caseId: string, dto: UpsertProjectProfileDto) {
    await this.getOwnedCase(organizationId, caseId);
    const data = { ...dto, criticalDependencies: dto.criticalDependencies as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalProjectProfile.upsert({
      where: { prequalificationCaseId: caseId },
      create: { prequalificationCaseId: caseId, ...data },
      update: data,
    });
  }

  // ── Bilan financier (1:1 + postes de coût, upsert + recalcul) ──

  async upsertFinancialModel(organizationId: string, caseId: string, dto: UpsertFinancialModelDto) {
    await this.getOwnedCase(organizationId, caseId);
    const { costLineItems, ...scalars } = dto;

    await this.prisma.$transaction(async (tx) => {
      const model = await tx.prequalFinancialModel.upsert({
        where: { prequalificationCaseId: caseId },
        create: { prequalificationCaseId: caseId, ...scalars },
        update: scalars,
      });
      if (costLineItems) {
        await tx.prequalCostLineItem.deleteMany({ where: { prequalFinancialModelId: model.id } });
        if (costLineItems.length > 0) {
          await tx.prequalCostLineItem.createMany({
            data: costLineItems.map((item, index) => ({
              prequalFinancialModelId: model.id,
              category: item.category,
              label: item.label,
              amount: item.amount,
              sortOrder: index,
            })),
          });
        }
      }
    });

    await this.recomputeFinancials(caseId);
    return this.prisma.prequalFinancialModel.findUniqueOrThrow({
      where: { prequalificationCaseId: caseId },
      include: { costLineItems: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  // ── Porteurs ──

  async createPerson(organizationId: string, caseId: string, dto: UpsertPersonDto) {
    await this.getOwnedCase(organizationId, caseId);
    const data: Prisma.PrequalPersonUncheckedCreateInput = { prequalificationCaseId: caseId, ...dto, trackRecord: dto.trackRecord as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalPerson.create({ data });
  }

  async updatePerson(organizationId: string, caseId: string, personId: string, dto: UpsertPersonDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalPerson', personId, caseId);
    const data: Prisma.PrequalPersonUncheckedUpdateInput = { ...dto, trackRecord: dto.trackRecord as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalPerson.update({ where: { id: personId }, data });
  }

  async deletePerson(organizationId: string, caseId: string, personId: string) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalPerson', personId, caseId);
    await this.prisma.prequalPerson.delete({ where: { id: personId } });
  }

  // ── Sociétés ──

  async createCompany(organizationId: string, caseId: string, dto: UpsertCompanyDto) {
    await this.getOwnedCase(organizationId, caseId);
    const data: Prisma.PrequalCompanyUncheckedCreateInput = { prequalificationCaseId: caseId, ...dto, executives: dto.executives as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalCompany.create({ data });
  }

  async updateCompany(organizationId: string, caseId: string, companyId: string, dto: UpsertCompanyDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalCompany', companyId, caseId);
    const data: Prisma.PrequalCompanyUncheckedUpdateInput = { ...dto, executives: dto.executives as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalCompany.update({ where: { id: companyId }, data });
  }

  async deleteCompany(organizationId: string, caseId: string, companyId: string) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalCompany', companyId, caseId);
    await this.prisma.prequalCompany.delete({ where: { id: companyId } });
  }

  // ── Lots (impactent le CA recalculé → déclenchent recomputeFinancials) ──

  async createLot(organizationId: string, caseId: string, dto: UpsertLotDto) {
    await this.getOwnedCase(organizationId, caseId);
    const count = await this.prisma.prequalSalesLot.count({ where: { prequalificationCaseId: caseId } });
    const lot = await this.prisma.prequalSalesLot.create({ data: { prequalificationCaseId: caseId, ...dto, sortOrder: count } });
    await this.recomputeFinancials(caseId);
    return lot;
  }

  async updateLot(organizationId: string, caseId: string, lotId: string, dto: UpsertLotDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalSalesLot', lotId, caseId);
    const lot = await this.prisma.prequalSalesLot.update({ where: { id: lotId }, data: dto });
    await this.recomputeFinancials(caseId);
    return lot;
  }

  async deleteLot(organizationId: string, caseId: string, lotId: string) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalSalesLot', lotId, caseId);
    await this.prisma.prequalSalesLot.delete({ where: { id: lotId } });
    await this.recomputeFinancials(caseId);
  }

  // ── Calendrier (1:1, upsert) ──

  async upsertTimeline(organizationId: string, caseId: string, dto: UpsertTimelineDto) {
    await this.getOwnedCase(organizationId, caseId);
    const data = { ...dto, dependencies: dto.dependencies as unknown as Prisma.InputJsonValue[] | undefined };
    return this.prisma.prequalTimelineAssessment.upsert({
      where: { prequalificationCaseId: caseId },
      create: { prequalificationCaseId: caseId, ...data },
      update: data,
    });
  }

  // ── Findings ──

  async createFinding(organizationId: string, caseId: string, dto: CreateFindingDto) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.finding.create({
      data: { prequalificationCaseId: caseId, ...dto, generatedBy: 'ANALYST' },
    });
  }

  async reviewFinding(organizationId: string, caseId: string, findingId: string, userId: string, dto: ReviewFindingDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('finding', findingId, caseId);
    return this.prisma.finding.update({
      where: { id: findingId },
      data: { reviewStatus: dto.reviewStatus, reviewedById: userId, reviewedAt: new Date() },
    });
  }

  // ── Questions décisives ──

  async createDecisiveQuestion(organizationId: string, caseId: string, dto: CreateDecisiveQuestionDto) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalDecisiveQuestion.create({ data: { prequalificationCaseId: caseId, ...dto } });
  }

  async answerDecisiveQuestion(organizationId: string, caseId: string, questionId: string, dto: AnswerDecisiveQuestionDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalDecisiveQuestion', questionId, caseId);
    return this.prisma.prequalDecisiveQuestion.update({
      where: { id: questionId },
      data: { answer: dto.answer, answeredAt: new Date() },
    });
  }

  // ── Demandes de documents ──

  async createDocumentRequest(organizationId: string, caseId: string, dto: CreateDocumentRequestDto) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalDocumentRequest.create({ data: { prequalificationCaseId: caseId, ...dto } });
  }

  async updateDocumentRequest(organizationId: string, caseId: string, requestId: string, dto: UpdateDocumentRequestDto) {
    await this.getOwnedCase(organizationId, caseId);
    await this.assertBelongsToCase('prequalDocumentRequest', requestId, caseId);
    return this.prisma.prequalDocumentRequest.update({ where: { id: requestId }, data: dto });
  }

  /**
   * Recalcule le bilan financier normalisé et réconcilie les Finding générés
   * par les règles (spec §9.4). La décision d'un analyste sur un Finding
   * encore déclenché (ACCEPTED/REJECTED/AMENDED) est préservée d'un recalcul
   * à l'autre — seul son contenu (statement/rationale/sévérité) est
   * rafraîchi ; un Finding dont la règle ne se déclenche plus est supprimé
   * (le point sous-jacent est résolu), jamais laissé orphelin en PENDING.
   */
  private async recomputeFinancials(caseId: string): Promise<void> {
    const model = await this.prisma.prequalFinancialModel.findUnique({
      where: { prequalificationCaseId: caseId },
      include: { costLineItems: true },
    });
    if (!model) return;

    const lots = await this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } });

    const costLineItems: PrequalCostLineItemInput[] = model.costLineItems.map((item) => ({
      category: item.category,
      label: item.label,
      amount: Number(item.amount),
    }));
    const lotInputs: PrequalLotInput[] = lots.map((lot) => ({
      label: lot.label,
      surfaceSqm: num(lot.surfaceSqm),
      askingPrice: num(lot.askingPrice),
      expectedPrice: num(lot.expectedPrice),
    }));

    const result = computePrequalFinancials({
      costLineItems,
      lots: lotInputs,
      otherRevenueRetained: num(model.otherRevenueRetained),
      provenEquity: num(model.provenEquity),
      declaredEquity: num(model.declaredEquity),
      declaredMarginPct: num(model.declaredMarginPct),
      declaredCoutDeRevient: num(model.declaredCoutDeRevient),
      declaredChiffreAffaires: num(model.declaredChiffreAffaires),
      amountRequested: num(model.amountRequested),
      landPrice: num(model.landPrice),
      bankDebt: model.ratiosIncludeBankDebt ? num(model.bankDebt) : null,
      includeBankDebtInRatios: model.ratiosIncludeBankDebt,
    });

    await this.prisma.prequalFinancialModel.update({
      where: { id: model.id },
      data: {
        coutDeRevient: result.coutDeRevient,
        chiffreAffaires: result.chiffreAffaires,
        margeRecalculee: result.marge,
        margeRecalculeePct: result.margePct,
        besoinMaxFinancement: result.besoinMaxFinancement,
        prixSortiePondere: result.prixSortiePondereParM2,
        pointMortAuM2: result.pointMortAuM2,
        ltaPct: result.ltaPct,
        ltcPct: result.ltcPct,
        ltvPct: result.ltvPct,
      },
    });

    const candidates = evaluatePrequalFinancialFindings(result, {
      declaredEquity: num(model.declaredEquity),
      provenEquity: num(model.provenEquity),
      amountRequested: num(model.amountRequested),
    });

    const existing = await this.prisma.finding.findMany({
      where: { prequalificationCaseId: caseId, generatedBy: 'RULE', ruleId: { not: null } },
    });
    const existingByRuleId = new Map(existing.map((finding) => [finding.ruleId as string, finding]));
    const candidateRuleIds = new Set(candidates.map((candidate) => candidate.ruleId));

    for (const candidate of candidates) {
      const match = existingByRuleId.get(candidate.ruleId);
      if (match) {
        await this.prisma.finding.update({
          where: { id: match.id },
          data: { category: candidate.category, severity: candidate.severity, statement: candidate.statement, rationale: candidate.rationale },
        });
      } else {
        await this.prisma.finding.create({
          data: {
            prequalificationCaseId: caseId,
            category: candidate.category,
            severity: candidate.severity,
            statement: candidate.statement,
            rationale: candidate.rationale,
            ruleId: candidate.ruleId,
            generatedBy: 'RULE',
          },
        });
      }
    }

    const staleIds = existing.filter((finding) => !candidateRuleIds.has(finding.ruleId as string)).map((finding) => finding.id);
    if (staleIds.length > 0) {
      await this.prisma.finding.deleteMany({ where: { id: { in: staleIds } } });
    }
  }

  private async assertBelongsToCase(model: 'prequalPerson' | 'prequalCompany' | 'prequalSalesLot' | 'finding' | 'prequalDecisiveQuestion' | 'prequalDocumentRequest', id: string, caseId: string) {
    const found = await (this.prisma[model] as { findFirst: (args: unknown) => Promise<unknown> }).findFirst({
      where: { id, prequalificationCaseId: caseId },
    });
    if (!found) throw new NotFoundException('Ressource introuvable pour ce dossier.');
  }
}
