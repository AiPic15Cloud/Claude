import { Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma, PrequalFinancialModel, PrequalCostLineItem, PrequalificationProjectType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { computePrequalFinancials, type PrequalCostLineItemInput, type PrequalLotInput, type PrequalFinancialResult, type PrequalScenario } from './prequal-financial.util';
import { computePrequalCovenants, type PrequalCovenantResult } from './prequal-covenant.util';
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

/**
 * Formes de réponse alignées sur `FinancialSynthesis`/`Covenants`/
 * `BpComparison`/`FinancialScenario` du Deal (apps/web/src/types/index.ts) —
 * pas des types Deal réutilisés directement (couplage), mais des formes
 * identiques exprès pour pouvoir réutiliser telles quelles côté frontend les
 * cartes déjà construites pour le Deal (FinancialSynthesisCard, CovenantsCard,
 * SensitivityComparisonCard), sans dupliquer ce code de présentation.
 */
export interface PrequalFinancialSynthesis {
  foncierTotal: number;
  travauxTotal: number;
  honorairesTechniquesTotal: number;
  agencyFees: number;
  referralFees: number;
  bankMiscFees: number;
  lpb: {
    collecte: number;
    tauxPct: number;
    tauxPctEffectif: number;
    latePenaltyApplied: boolean;
    latePenaltyEffective: boolean;
    dureeCibleMonths: number;
    interestOnDurationCible: number;
    feesHT: number;
    feesTTC: number;
    guaranteeFeesEstimate: number;
    hasActiveHypotheque: boolean;
    totalFees: number;
    netDisbursed: number;
  };
  bank: { enabled: false } | { enabled: true; name: string; loanTotal: number; interestOnDurationCible: number; totalFees: number };
  coutDeRevient: number;
  prixDeVente: number;
  prixDeVenteSource: 'LOTS';
  saleLotsSummary: { count: number; soldCount: number; totalSurfaceSqm: number; totalSalePrice: number; avgPricePerSqm: number | null } | null;
  marge: number;
  margePct: number;
  expositionFinale: number;
  ratios: { lta: number | null; ltc: number | null; ltv: number | null; ltaAvecBanque: number | null; ltcAvecBanque: number | null; ltvAvecBanque: number | null };
}

export interface PrequalBpComparisonLine {
  key: string;
  label: string;
  initial: number;
  current: number;
  deltaAbs: number;
  deltaPct: number | null;
  initialPct?: number;
  currentPct?: number;
}

export interface PrequalBpComparison {
  hasData: boolean;
  locked: boolean;
  lockedAt: Date | null;
  lines: PrequalBpComparisonLine[];
  sensitivity: { initial: PrequalScenario[]; current: PrequalScenario[] } | null;
  marginAlert: { level: 'ATTENTION' | 'URGENT'; message: string } | null;
  disclaimer: string | null;
}

interface PrequalBaselineSnapshot {
  prixDeVente: number;
  foncier: number;
  travaux: number;
  honorairesTechniques: number;
  autresFrais: number;
  financementLpb: number;
  coutDeRevient: number;
  marge: number;
  margePct: number | null;
  sensitivity: PrequalScenario[];
}

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
    if (!found.financial) return found;
    const detail = this.buildFinancialDetail(found.financial, found.lots, found.projectType);
    return { ...found, financial: { ...found.financial, ...detail } };
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
    const [model, lots, prequalCase] = await Promise.all([
      this.prisma.prequalFinancialModel.findUniqueOrThrow({
        where: { prequalificationCaseId: caseId },
        include: { costLineItems: { orderBy: { sortOrder: 'asc' } } },
      }),
      this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } }),
      this.prisma.prequalificationCase.findUniqueOrThrow({ where: { id: caseId }, select: { projectType: true } }),
    ]);
    return { ...model, ...this.buildFinancialDetail(model, lots, prequalCase.projectType) };
  }

  /**
   * Fige le BP initial — instantané des totaux calculés maintenant (Foncier,
   * Travaux, Honoraires, financement, marge, sensibilité). Même doctrine que
   * FinancialModelService.lockBaseline() côté Deal : l'utilisateur choisit
   * explicitement le moment où sa saisie est terminée, jamais reconstruit
   * depuis la première sauvegarde (potentiellement partielle).
   */
  async lockBaseline(organizationId: string, caseId: string, userId: string) {
    await this.getOwnedCase(organizationId, caseId);
    const model = await this.prisma.prequalFinancialModel.findUnique({ where: { prequalificationCaseId: caseId }, include: { costLineItems: true } });
    if (!model) throw new NotFoundException('Aucun bilan financier à figer pour ce dossier.');
    const lots = await this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } });
    const result = this.computeResult(model, lots);

    const snapshot: PrequalBaselineSnapshot = {
      prixDeVente: result.chiffreAffaires,
      foncier: result.foncierTotal,
      travaux: result.travauxTotal,
      honorairesTechniques: result.honorairesTechniquesTotal,
      autresFrais: result.autresFraisScalaires,
      financementLpb: result.financing.totalFees,
      coutDeRevient: result.coutDeRevient,
      marge: result.marge,
      margePct: result.margePct,
      sensitivity: result.sensitivity,
    };

    await this.prisma.prequalFinancialModel.update({
      where: { id: model.id },
      data: { baselineSnapshot: snapshot as unknown as Prisma.InputJsonValue, baselineLockedAt: new Date(), baselineLockedById: userId },
    });
  }

  /**
   * BP initial vs actualisé — ne compare que si un instantané a été figé
   * (voir lockBaseline). Seuils d'alerte de marge identiques à
   * FinancialModelService.computeMarginAlert() côté Deal, validés
   * explicitement avec l'utilisateur pour ce module.
   */
  async getBpComparison(organizationId: string, caseId: string): Promise<PrequalBpComparison> {
    await this.getOwnedCase(organizationId, caseId);
    const model = await this.prisma.prequalFinancialModel.findUnique({ where: { prequalificationCaseId: caseId }, include: { costLineItems: true } });
    if (!model) return { hasData: false, locked: false, lockedAt: null, lines: [], sensitivity: null, marginAlert: null, disclaimer: null };

    if (!model.baselineLockedAt || !model.baselineSnapshot) {
      return {
        hasData: true,
        locked: false,
        lockedAt: null,
        lines: [],
        sensitivity: null,
        marginAlert: null,
        disclaimer:
          "Le BP initial n'est pas encore figé. Terminez la saisie du bilan (Foncier, Travaux, Honoraires, grille de lots…) puis cliquez sur « Figer le BP initial » : à partir de ce moment, tout changement apparaîtra comme un écart dans le BP actualisé.",
      };
    }

    const snap = model.baselineSnapshot as unknown as PrequalBaselineSnapshot;
    const lots = await this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } });
    const current = this.computeResult(model, lots);

    const line = (key: string, label: string, initial: number, curr: number): PrequalBpComparisonLine => {
      const deltaAbs = curr - initial;
      const deltaPct = initial !== 0 ? Math.round((deltaAbs / Math.abs(initial)) * 1000) / 10 : null;
      return { key, label, initial: Math.round(initial), current: Math.round(curr), deltaAbs: Math.round(deltaAbs), deltaPct };
    };

    return {
      hasData: true,
      locked: true,
      lockedAt: model.baselineLockedAt,
      lines: [
        line('prixDeVente', "Chiffre d'affaires", snap.prixDeVente, current.chiffreAffaires),
        line('foncier', 'Foncier', snap.foncier, current.foncierTotal),
        line('travaux', 'Travaux', snap.travaux, current.travauxTotal),
        line('honorairesTechniques', 'Honoraires techniques', snap.honorairesTechniques, current.honorairesTechniquesTotal),
        line('autresFrais', 'Autres frais (hors financement)', snap.autresFrais, current.autresFraisScalaires),
        line('financementLpb', 'Frais de financement', snap.financementLpb, current.financing.totalFees),
        line('coutDeRevient', 'Coût de revient', snap.coutDeRevient, current.coutDeRevient),
        {
          key: 'marge',
          label: 'Marge avant impôts',
          initial: Math.round(snap.marge),
          current: Math.round(current.marge),
          deltaAbs: Math.round(current.marge - snap.marge),
          deltaPct: null,
          initialPct: snap.margePct ?? undefined,
          currentPct: current.margePct ?? undefined,
        },
      ],
      sensitivity: { initial: snap.sensitivity, current: current.sensitivity },
      marginAlert: PrequalificationService.computeMarginAlert(snap.margePct ?? 0, current.margePct ?? 0),
      disclaimer: `BP initial figé le ${model.baselineLockedAt.toLocaleDateString('fr-FR')}. Tout écart provient d'une modification réelle survenue après cette date — cliquez à nouveau sur « Figer le BP initial » pour redémarrer le suivi à partir d'aujourd'hui.`,
    };
  }

  private static computeMarginAlert(initialPct: number, currentPct: number): { level: 'ATTENTION' | 'URGENT'; message: string } | null {
    const drop = Math.round((initialPct - currentPct) * 10) / 10;
    if (currentPct < 0 || drop >= 20) {
      return currentPct < 0
        ? { level: 'URGENT', message: `Marge actualisée négative (${currentPct}%) — ce dossier ne dégage plus de marge au bilan actuel.` }
        : { level: 'URGENT', message: `Marge dégradée de ${drop} pts depuis le BP initial (${initialPct}% → ${currentPct}%) — écart significatif à examiner.` };
    }
    if (currentPct < 10 || drop >= 10) {
      return currentPct < 10
        ? { level: 'ATTENTION', message: `Marge actualisée faible (${currentPct}%) — sous le seuil de vigilance de 10 %.` }
        : { level: 'ATTENTION', message: `Marge en baisse de ${drop} pts depuis le BP initial (${initialPct}% → ${currentPct}%).` };
    }
    return null;
  }

  private computeResult(
    model: PrequalFinancialModel & { costLineItems: PrequalCostLineItem[] },
    lots: { surfaceSqm: Prisma.Decimal | null; askingPrice: Prisma.Decimal | null; expectedPrice: Prisma.Decimal | null }[],
  ): PrequalFinancialResult {
    const travauxItems: PrequalCostLineItemInput[] = model.costLineItems
      .filter((i) => i.category === 'TRAVAUX')
      .map((i) => ({ category: i.category, label: i.label, amount: Number(i.amount) }));
    const honorairesTechniquesItems: PrequalCostLineItemInput[] = model.costLineItems
      .filter((i) => i.category === 'HONORAIRES_TECHNIQUES')
      .map((i) => ({ category: i.category, label: i.label, amount: Number(i.amount) }));
    const lotInputs: PrequalLotInput[] = lots.map((lot) => ({
      label: '',
      surfaceSqm: num(lot.surfaceSqm),
      askingPrice: num(lot.askingPrice),
      expectedPrice: num(lot.expectedPrice),
    }));

    return computePrequalFinancials({
      travauxItems,
      honorairesTechniquesItems,
      lots: lotInputs,
      otherRevenueRetained: num(model.otherRevenueRetained),
      provenEquity: num(model.provenEquity),
      declaredEquity: num(model.declaredEquity),
      declaredMarginPct: num(model.declaredMarginPct),
      declaredCoutDeRevient: num(model.declaredCoutDeRevient),
      declaredChiffreAffaires: num(model.declaredChiffreAffaires),
      amountRequested: num(model.amountRequested),
      landPrice: num(model.landPrice),
      notaryFees: num(model.notaryFees),
      diagnosticsCost: num(model.diagnosticsCost),
      insuranceCost: num(model.insuranceCost),
      propertyTaxCost: num(model.propertyTaxCost),
      surveyStudiesCost: num(model.surveyStudiesCost),
      agencyFees: num(model.agencyFees),
      referralFees: num(model.referralFees),
      bankMiscFees: num(model.bankMiscFees),
      interestRatePct: num(model.interestRatePct),
      durationTargetMonths: model.durationTargetMonths,
      feesPctHT: num(model.feesPctHT),
      tvaApplicable: model.tvaApplicable,
      tvaRatePct: num(model.tvaRatePct),
      latePenaltyApplied: model.latePenaltyApplied,
      hypothequeEnvisagee: model.hypothequeEnvisagee,
      bankName: model.bankName,
      bankLoanAcquisition: num(model.bankLoanAcquisition),
      bankLoanAccompagnement: num(model.bankLoanAccompagnement),
      bankInterestRatePct: num(model.bankInterestRatePct),
      bankFileFees: num(model.bankFileFees),
      bankGuaranteeFees: num(model.bankGuaranteeFees),
    });
  }

  /**
   * Reformate PrequalFinancialResult (moteur pur) en formes identiques à
   * FinancialSynthesis/Covenants du Deal — voir commentaire en tête de
   * fichier. `lots` doit porter surfaceSqm/status pour saleLotsSummary.
   */
  private buildFinancialDetail(
    model: PrequalFinancialModel & { costLineItems: PrequalCostLineItem[] },
    lots: { surfaceSqm: Prisma.Decimal | null; askingPrice: Prisma.Decimal | null; expectedPrice: Prisma.Decimal | null; status: string }[],
    projectType: PrequalificationProjectType | null,
  ): { synthesis: PrequalFinancialSynthesis; sensitivity: PrequalScenario[]; covenants: PrequalCovenantResult } {
    const result = this.computeResult(model, lots);

    const totalSurfaceSqm = Math.round(lots.reduce((sum, lot) => sum + (num(lot.surfaceSqm) ?? 0), 0) * 100) / 100;
    const saleLotsSummary =
      lots.length > 0
        ? {
            count: lots.length,
            soldCount: lots.filter((lot) => lot.status === 'DEED').length,
            totalSurfaceSqm,
            totalSalePrice: result.chiffreAffaires,
            avgPricePerSqm: totalSurfaceSqm > 0 ? Math.round(result.chiffreAffaires / totalSurfaceSqm) : null,
          }
        : null;

    const synthesis: PrequalFinancialSynthesis = {
      foncierTotal: result.foncierTotal,
      travauxTotal: result.travauxTotal,
      honorairesTechniquesTotal: result.honorairesTechniquesTotal,
      agencyFees: num(model.agencyFees) ?? 0,
      referralFees: num(model.referralFees) ?? 0,
      bankMiscFees: num(model.bankMiscFees) ?? 0,
      lpb: {
        collecte: result.financing.collecte,
        tauxPct: result.financing.tauxPct ?? 0,
        tauxPctEffectif: result.financing.tauxPctEffectif ?? 0,
        latePenaltyApplied: model.latePenaltyApplied,
        latePenaltyEffective: result.financing.latePenaltyEffective,
        dureeCibleMonths: result.financing.dureeCibleMonths ?? 0,
        interestOnDurationCible: result.financing.interestOnDurationCible,
        feesHT: result.financing.feesHT,
        feesTTC: result.financing.feesTTC,
        guaranteeFeesEstimate: result.financing.guaranteeFeesEstimate,
        hasActiveHypotheque: model.hypothequeEnvisagee,
        totalFees: result.financing.totalFees,
        netDisbursed: result.financing.netDisbursed,
      },
      bank: result.bank.enabled
        ? { enabled: true, name: result.bank.name ?? '', loanTotal: result.bank.loanTotal, interestOnDurationCible: result.bank.interestOnDurationCible, totalFees: result.bank.totalFees }
        : { enabled: false },
      coutDeRevient: result.coutDeRevient,
      prixDeVente: result.chiffreAffaires,
      prixDeVenteSource: 'LOTS',
      saleLotsSummary,
      marge: result.marge,
      margePct: result.margePct ?? 0,
      expositionFinale: result.expositionFinale,
      ratios: {
        lta: result.ltaPct !== null ? result.ltaPct / 100 : null,
        ltc: result.ltcPct !== null ? result.ltcPct / 100 : null,
        ltv: result.ltvPct !== null ? result.ltvPct / 100 : null,
        ltaAvecBanque: result.ltaAvecBanquePct !== null ? result.ltaAvecBanquePct / 100 : null,
        ltcAvecBanque: result.ltcAvecBanquePct !== null ? result.ltcAvecBanquePct / 100 : null,
        ltvAvecBanque: result.ltvAvecBanquePct !== null ? result.ltvAvecBanquePct / 100 : null,
      },
    };

    const covenants = computePrequalCovenants({
      projectType,
      ltvPct: result.ltvPct,
      financingInterestOnDurationCible: result.financing.interestOnDurationCible,
      totalFinancingExposure: result.financing.collecte + result.bank.loanTotal,
      resultatOperationnelEstime: num(model.resultatOperationnelEstime),
      fluxTresorerieDisponibleEstime: num(model.fluxTresorerieDisponibleEstime),
    });

    return { synthesis, sensitivity: result.sensitivity, covenants };
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
    const result = this.computeResult(model, lots);

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
