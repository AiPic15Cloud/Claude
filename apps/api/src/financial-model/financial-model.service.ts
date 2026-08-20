import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { FieldChangeService } from '../field-changes/field-change.service';
import { UpsertFinancialAssumptionDto } from './dto/upsert-financial-assumption.dto';

const FINANCIAL_FIELD_LABELS: Record<string, string> = {
  surfaceSqm: 'Surface',
  sellingPricePerSqm: 'Prix de vente/m²',
  targetMarginPct: 'Marge cible',
  notes: 'Notes',
  landPrice: 'Foncier — prix d’acquisition',
  notaryFees: 'Foncier — frais de notaire',
  diagnosticsCost: 'Honoraires techniques — diagnostics',
  insuranceCost: 'Honoraires techniques — assurance',
  propertyTaxCost: 'Honoraires techniques — taxe foncière',
  surveyStudiesCost: 'Honoraires techniques — géomètre/études',
  agencyFees: 'Autres frais — honoraires d’agence',
  bankMiscFees: 'Autres frais — frais bancaires divers',
  lpbFeesPctHT: 'Financement LPB — % fees HT',
  lpbTvaApplicable: 'Financement LPB — TVA applicable',
  lpbTvaRatePct: 'Financement LPB — taux de TVA',
  lpbDurationMinMonths: 'Financement LPB — durée min (mois)',
  lpbDurationMaxMonths: 'Financement LPB — durée max (mois)',
  bankName: 'Financement bancaire — banque',
  bankLoanAcquisition: 'Financement bancaire — crédit acquisition',
  bankLoanAccompagnement: 'Financement bancaire — crédit accompagnement',
  bankInterestRatePct: 'Financement bancaire — taux',
  bankFileFees: 'Financement bancaire — frais de dossier',
  bankGuaranteeFees: 'Financement bancaire — frais de garantie',
};

interface Scenario {
  label: string;
  sellingPricePerSqm: number;
  constructionCostPerSqm: number;
  revenue: number;
  totalCost: number;
  margin: number;
  marginPct: number;
}

type AssumptionRow = Prisma.FinancialAssumptionGetPayload<Record<string, never>>;

@Injectable()
export class FinancialModelService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly fieldChanges: FieldChangeService,
  ) {}

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  async get(organizationId: string, dealId: string) {
    const deal = await this.assertDeal(organizationId, dealId);
    const assumption = await this.prisma.financialAssumption.findUnique({ where: { dealId } });
    if (!assumption) return { assumption: null, valuation: null, sensitivity: null, synthesis: null };
    return this.buildResponse(organizationId, dealId, deal, assumption);
  }

  async upsert(organizationId: string, dealId: string, userId: string, dto: UpsertFinancialAssumptionDto) {
    const deal = await this.assertDeal(organizationId, dealId);
    const { sourceDocumentId, ...values } = dto;

    if (sourceDocumentId) {
      const document = await this.prisma.document.findFirst({ where: { id: sourceDocumentId, dealId } });
      if (!document) throw new NotFoundException('Document source introuvable pour ce dossier');
    }

    const previous = await this.prisma.financialAssumption.findUnique({ where: { dealId } });

    const assumption = await this.prisma.financialAssumption.upsert({
      where: { dealId },
      create: { dealId, ...values },
      update: { ...values },
    });

    await this.activities.log(dealId, userId, 'FINANCIAL_MODEL_UPDATED', 'Modèle financier mis à jour');

    await this.fieldChanges.recordDiff(
      organizationId,
      dealId,
      'FinancialAssumption',
      userId,
      Object.keys(FINANCIAL_FIELD_LABELS).map((key) => ({
        key,
        label: FINANCIAL_FIELD_LABELS[key],
        oldValue: previous ? (previous as unknown as Record<string, unknown>)[key] : null,
        newValue: (assumption as unknown as Record<string, unknown>)[key],
      })),
      sourceDocumentId,
    );

    return this.buildResponse(organizationId, dealId, deal, assumption);
  }

  private async buildResponse(
    organizationId: string,
    dealId: string,
    deal: { amountTarget: Prisma.Decimal; interestRate: Prisma.Decimal | null; durationMonths: number | null },
    assumption: AssumptionRow,
  ) {
    const [travauxItems, hasActiveHypotheque] = await Promise.all([
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'TRAVAUX' }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.guarantee.findFirst({ where: { dealId, type: 'HYPOTHEQUE', status: 'ACTIVE' } }).then(Boolean),
    ]);

    const num = (v: Prisma.Decimal | number | null | undefined): number => (v === null || v === undefined ? 0 : Number(v));

    const surface = num(assumption.surfaceSqm);
    const sellingPricePerSqm = num(assumption.sellingPricePerSqm);

    const foncierTotal = num(assumption.landPrice) + num(assumption.notaryFees);
    const travauxTotal = travauxItems.reduce((sum, item) => sum + num(item.amount), 0);
    const honorairesTechniquesTotal =
      num(assumption.diagnosticsCost) + num(assumption.insuranceCost) + num(assumption.propertyTaxCost) + num(assumption.surveyStudiesCost);

    const collecte = num(deal.amountTarget);
    const tauxLpb = num(deal.interestRate) / 100;
    const dureeCibleLpb = deal.durationMonths ?? 0;

    const lpbInterestOnDurationCible = (collecte * tauxLpb * dureeCibleLpb) / 12;
    const lpbFeesHT = collecte * (num(assumption.lpbFeesPctHT) / 100);
    const lpbFeesTTC = assumption.lpbTvaApplicable ? lpbFeesHT * (1 + num(assumption.lpbTvaRatePct) / 100) : lpbFeesHT;
    const guaranteeFeesEstimate = hasActiveHypotheque ? collecte * 0.015 : 0;
    const lpbTotalFees = guaranteeFeesEstimate + lpbInterestOnDurationCible + lpbFeesTTC;
    const lpbNetDisbursed = collecte - lpbFeesTTC;

    const bankEnabled = Boolean(assumption.bankName);
    const bankLoanTotal = bankEnabled ? num(assumption.bankLoanAcquisition) + num(assumption.bankLoanAccompagnement) : 0;
    const bankInterestOnDurationCible = bankEnabled ? (bankLoanTotal * (num(assumption.bankInterestRatePct) / 100) * dureeCibleLpb) / 12 : 0;
    const bankTotalFees = bankEnabled ? bankInterestOnDurationCible + num(assumption.bankGuaranteeFees) + num(assumption.bankFileFees) * 1.2 : 0;

    const autresFraisTotal = num(assumption.agencyFees) + num(assumption.bankMiscFees) + lpbTotalFees;

    const coutDeRevient = foncierTotal + travauxTotal + honorairesTechniquesTotal + autresFraisTotal;
    const prixDeVente = sellingPricePerSqm * surface;
    const marge = prixDeVente - coutDeRevient;
    const margePct = prixDeVente > 0 ? Math.round((marge / prixDeVente) * 1000) / 10 : 0;

    const expositionFinale = coutDeRevient - bankLoanTotal - collecte;

    const ratio = (numerator: number, denominator: number): number | null => (denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : null);

    const synthesis = {
      foncierTotal: Math.round(foncierTotal),
      travauxTotal: Math.round(travauxTotal),
      honorairesTechniquesTotal: Math.round(honorairesTechniquesTotal),
      agencyFees: num(assumption.agencyFees),
      bankMiscFees: num(assumption.bankMiscFees),
      lpb: {
        collecte: Math.round(collecte),
        tauxPct: num(deal.interestRate),
        dureeCibleMonths: dureeCibleLpb,
        interestOnDurationCible: Math.round(lpbInterestOnDurationCible),
        feesHT: Math.round(lpbFeesHT),
        feesTTC: Math.round(lpbFeesTTC),
        guaranteeFeesEstimate: Math.round(guaranteeFeesEstimate),
        hasActiveHypotheque,
        totalFees: Math.round(lpbTotalFees),
        netDisbursed: Math.round(lpbNetDisbursed),
      },
      bank: bankEnabled
        ? {
            enabled: true,
            name: assumption.bankName,
            loanTotal: Math.round(bankLoanTotal),
            interestOnDurationCible: Math.round(bankInterestOnDurationCible),
            totalFees: Math.round(bankTotalFees),
          }
        : { enabled: false },
      coutDeRevient: Math.round(coutDeRevient),
      prixDeVente: Math.round(prixDeVente),
      marge: Math.round(marge),
      margePct,
      expositionFinale: Math.round(expositionFinale),
      ratios: {
        lta: ratio(collecte, num(assumption.landPrice)),
        ltc: ratio(collecte, coutDeRevient),
        ltv: ratio(collecte, prixDeVente),
        ltaAvecBanque: ratio(collecte + bankLoanTotal + bankTotalFees, num(assumption.landPrice)),
        ltcAvecBanque: ratio(collecte + bankLoanTotal + bankTotalFees, coutDeRevient),
        ltvAvecBanque: ratio(collecte + bankLoanTotal + bankTotalFees, prixDeVente),
      },
    };

    const compute = (label: string, price: number, cost: number): Scenario => {
      const revenue = price * surface;
      const totalCost = cost;
      const margin = revenue - totalCost;
      return {
        label,
        sellingPricePerSqm: Math.round(price),
        constructionCostPerSqm: surface > 0 ? Math.round(cost / surface) : 0,
        revenue: Math.round(revenue),
        totalCost: Math.round(totalCost),
        margin: Math.round(margin),
        marginPct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0,
      };
    };

    const base = compute('Base', sellingPricePerSqm, coutDeRevient);
    const sensitivity: Scenario[] = [compute('Pessimiste', sellingPricePerSqm * 0.9, coutDeRevient * 1.1), base, compute('Optimiste', sellingPricePerSqm * 1.1, coutDeRevient * 0.9)];

    return {
      assumption: {
        surfaceSqm: surface,
        sellingPricePerSqm,
        targetMarginPct: assumption.targetMarginPct !== null ? Number(assumption.targetMarginPct) : null,
        notes: assumption.notes,
        landPrice: assumption.landPrice !== null ? Number(assumption.landPrice) : null,
        notaryFees: assumption.notaryFees !== null ? Number(assumption.notaryFees) : null,
        diagnosticsCost: assumption.diagnosticsCost !== null ? Number(assumption.diagnosticsCost) : null,
        insuranceCost: assumption.insuranceCost !== null ? Number(assumption.insuranceCost) : null,
        propertyTaxCost: assumption.propertyTaxCost !== null ? Number(assumption.propertyTaxCost) : null,
        surveyStudiesCost: assumption.surveyStudiesCost !== null ? Number(assumption.surveyStudiesCost) : null,
        agencyFees: assumption.agencyFees !== null ? Number(assumption.agencyFees) : null,
        bankMiscFees: assumption.bankMiscFees !== null ? Number(assumption.bankMiscFees) : null,
        lpbFeesPctHT: assumption.lpbFeesPctHT !== null ? Number(assumption.lpbFeesPctHT) : null,
        lpbTvaApplicable: assumption.lpbTvaApplicable,
        lpbTvaRatePct: assumption.lpbTvaRatePct !== null ? Number(assumption.lpbTvaRatePct) : null,
        lpbDurationMinMonths: assumption.lpbDurationMinMonths,
        lpbDurationMaxMonths: assumption.lpbDurationMaxMonths,
        bankName: assumption.bankName,
        bankLoanAcquisition: assumption.bankLoanAcquisition !== null ? Number(assumption.bankLoanAcquisition) : null,
        bankLoanAccompagnement: assumption.bankLoanAccompagnement !== null ? Number(assumption.bankLoanAccompagnement) : null,
        bankInterestRatePct: assumption.bankInterestRatePct !== null ? Number(assumption.bankInterestRatePct) : null,
        bankFileFees: assumption.bankFileFees !== null ? Number(assumption.bankFileFees) : null,
        bankGuaranteeFees: assumption.bankGuaranteeFees !== null ? Number(assumption.bankGuaranteeFees) : null,
      },
      travauxItems: travauxItems.map((item) => ({ id: item.id, label: item.label, amount: Number(item.amount), sortOrder: item.sortOrder })),
      valuation: base,
      sensitivity,
      synthesis,
    };
  }
}
