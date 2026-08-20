import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { FieldChangeService } from '../field-changes/field-change.service';
import { UpsertFinancialAssumptionDto } from './dto/upsert-financial-assumption.dto';

const FINANCIAL_FIELD_LABELS: Record<string, string> = {
  surfaceSqm: 'Surface',
  constructionCostPerSqm: 'Coût de construction/m²',
  sellingPricePerSqm: 'Prix de vente/m²',
  otherCosts: 'Autres coûts',
  targetMarginPct: 'Marge cible',
  notes: 'Notes',
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
    await this.assertDeal(organizationId, dealId);
    const assumption = await this.prisma.financialAssumption.findUnique({ where: { dealId } });
    if (!assumption) return { assumption: null, valuation: null, sensitivity: null };
    return this.buildResponse(assumption);
  }

  async upsert(organizationId: string, dealId: string, userId: string, dto: UpsertFinancialAssumptionDto) {
    await this.assertDeal(organizationId, dealId);
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
      [
        { key: 'surfaceSqm', label: FINANCIAL_FIELD_LABELS.surfaceSqm, oldValue: previous?.surfaceSqm, newValue: assumption.surfaceSqm },
        {
          key: 'constructionCostPerSqm',
          label: FINANCIAL_FIELD_LABELS.constructionCostPerSqm,
          oldValue: previous?.constructionCostPerSqm,
          newValue: assumption.constructionCostPerSqm,
        },
        {
          key: 'sellingPricePerSqm',
          label: FINANCIAL_FIELD_LABELS.sellingPricePerSqm,
          oldValue: previous?.sellingPricePerSqm,
          newValue: assumption.sellingPricePerSqm,
        },
        { key: 'otherCosts', label: FINANCIAL_FIELD_LABELS.otherCosts, oldValue: previous?.otherCosts, newValue: assumption.otherCosts },
        {
          key: 'targetMarginPct',
          label: FINANCIAL_FIELD_LABELS.targetMarginPct,
          oldValue: previous?.targetMarginPct,
          newValue: assumption.targetMarginPct,
        },
        { key: 'notes', label: FINANCIAL_FIELD_LABELS.notes, oldValue: previous?.notes, newValue: assumption.notes },
      ],
      sourceDocumentId,
    );

    return this.buildResponse(assumption);
  }

  private buildResponse(assumption: {
    surfaceSqm: unknown;
    constructionCostPerSqm: unknown;
    sellingPricePerSqm: unknown;
    otherCosts: unknown;
    targetMarginPct: unknown;
  }) {
    const surface = Number(assumption.surfaceSqm);
    const baseCost = Number(assumption.constructionCostPerSqm);
    const basePrice = Number(assumption.sellingPricePerSqm);
    const otherCosts = Number(assumption.otherCosts);

    const compute = (label: string, price: number, cost: number): Scenario => {
      const revenue = price * surface;
      const totalCost = cost * surface + otherCosts;
      const margin = revenue - totalCost;
      return {
        label,
        sellingPricePerSqm: Math.round(price),
        constructionCostPerSqm: Math.round(cost),
        revenue: Math.round(revenue),
        totalCost: Math.round(totalCost),
        margin: Math.round(margin),
        marginPct: revenue > 0 ? Math.round((margin / revenue) * 1000) / 10 : 0,
      };
    };

    const base = compute('Base', basePrice, baseCost);
    const sensitivity: Scenario[] = [
      compute('Pessimiste', basePrice * 0.9, baseCost * 1.1),
      base,
      compute('Optimiste', basePrice * 1.1, baseCost * 0.9),
    ];

    return {
      assumption: {
        surfaceSqm: surface,
        constructionCostPerSqm: baseCost,
        sellingPricePerSqm: basePrice,
        otherCosts,
        targetMarginPct: assumption.targetMarginPct !== null ? Number(assumption.targetMarginPct) : null,
      },
      valuation: base,
      sensitivity,
    };
  }
}
