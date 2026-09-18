import { Injectable, NotFoundException } from '@nestjs/common';
import type { PrequalFinancialModel } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { DvfSearchService } from '../intelligence-marche/dvf-search.service';
import { computePrequalStressTests, type PrequalStressScenario, type PrequalStressLotInput } from './prequal-stress-test.util';

const num = (value: { toNumber(): number } | null | undefined): number | null => (value != null ? Number(value) : null);

/**
 * Stress tests (spec §11) — combine le bilan financier déjà saisi (mêmes
 * champs bruts que `prequal-financial.util.ts`) et, quand disponible, la
 * médiane de marché déjà calculée par `MarketStudyService` (spec §10) pour
 * le scénario "vente du lot le plus important à la médiane" — jamais une
 * médiane recalculée en double.
 */
@Injectable()
export class StressTestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly dvfSearch: DvfSearchService,
  ) {}

  async getStressTests(organizationId: string, caseId: string): Promise<PrequalStressScenario[]> {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: { project: true, financial: true },
    });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');
    if (!prequalCase.financial) return [];

    const [lots, medianPricePerSqm] = await Promise.all([
      this.prisma.prequalSalesLot.findMany({ where: { prequalificationCaseId: caseId } }),
      this.resolveMedianPricePerSqm(prequalCase.project?.city ?? null, prequalCase.project?.postcode ?? null),
    ]);

    const model = prequalCase.financial;
    const travauxItems = await this.prisma.prequalCostLineItem.findMany({ where: { prequalFinancialModelId: model.id, category: 'TRAVAUX' } });
    const travauxTotal = travauxItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const honorairesTechniquesItems = await this.prisma.prequalCostLineItem.findMany({
      where: { prequalFinancialModelId: model.id, category: 'HONORAIRES_TECHNIQUES' },
    });
    const honorairesTechniquesTotal =
      (num(model.diagnosticsCost) ?? 0) +
      (num(model.insuranceCost) ?? 0) +
      (num(model.propertyTaxCost) ?? 0) +
      (num(model.surveyStudiesCost) ?? 0) +
      honorairesTechniquesItems.reduce((sum, item) => sum + Number(item.amount), 0);

    const lotInputs: PrequalStressLotInput[] = lots.map((lot) => ({
      label: lot.label,
      surfaceSqm: num(lot.surfaceSqm),
      price: num(lot.expectedPrice) ?? num(lot.askingPrice),
      status: lot.status,
    }));

    const chiffreAffaires = lotInputs.reduce((sum, lot) => sum + (lot.price ?? 0), 0);
    const foncierTotal = (num(model.landPrice) ?? 0) + (num(model.notaryFees) ?? 0);
    const bankEnabled = Boolean(model.bankName);

    return computePrequalStressTests({
      foncierTotal,
      travauxTotal,
      honorairesTechniquesTotal,
      autresFraisScalaires: (num(model.agencyFees) ?? 0) + (num(model.referralFees) ?? 0) + (num(model.bankMiscFees) ?? 0),
      chiffreAffaires,
      otherRevenueRetained: num(model.otherRevenueRetained),
      amountRequested: num(model.amountRequested),
      landPrice: num(model.landPrice),
      interestRatePct: num(model.interestRatePct),
      latePenaltyApplied: model.latePenaltyApplied,
      durationTargetMonths: model.durationTargetMonths,
      feesTTC: this.computeFeesTTC(model),
      guaranteeFeesEstimate: model.hypothequeEnvisagee ? round2((num(model.amountRequested) ?? 0) * 0.015) : 0,
      bankEnabled,
      bankLoanTotal: bankEnabled ? (num(model.bankLoanAcquisition) ?? 0) + (num(model.bankLoanAccompagnement) ?? 0) : 0,
      bankInterestRatePct: num(model.bankInterestRatePct),
      bankFixedFees: bankEnabled ? (num(model.bankGuaranteeFees) ?? 0) + (num(model.bankFileFees) ?? 0) * 1.2 : 0,
      lots: lotInputs,
      medianPricePerSqm,
      acquisitionStatus: prequalCase.project?.acquisitionStatus ?? null,
    });
  }

  private computeFeesTTC(model: Pick<PrequalFinancialModel, 'feesPctHT' | 'amountRequested' | 'tvaApplicable' | 'tvaRatePct'>): number {
    const collecte = num(model.amountRequested) ?? 0;
    const feesPctHT = num(model.feesPctHT);
    const feesHT = feesPctHT !== null ? round2(collecte * (feesPctHT / 100)) : 0;
    const tvaRatePct = num(model.tvaRatePct);
    return model.tvaApplicable && tvaRatePct !== null ? round2(feesHT * (1 + tvaRatePct / 100)) : feesHT;
  }

  private async resolveMedianPricePerSqm(city: string | null, postcode: string | null): Promise<number | null> {
    const query = [city, postcode].filter(Boolean).join(' ');
    if (!query) return null;
    const result = await this.dvfSearch.search(query);
    return result.medianPricePerSqm;
  }
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}
