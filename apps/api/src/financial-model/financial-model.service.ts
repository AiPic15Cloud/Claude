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
  referralFees: 'Autres frais — apport d’affaires',
  bankMiscFees: 'Autres frais — frais bancaires divers',
  lpbFeesPctHT: 'Financement LPB — % fees HT',
  lpbTvaApplicable: 'Financement LPB — TVA applicable',
  lpbTvaRatePct: 'Financement LPB — taux de TVA',
  lpbDurationMinMonths: 'Financement LPB — durée min (mois)',
  lpbDurationMaxMonths: 'Financement LPB — durée max (mois)',
  latePenaltyApplied: 'Financement LPB — pénalité de retard appliquée (+5 pts)',
  bankName: 'Financement bancaire — banque',
  bankLoanAcquisition: 'Financement bancaire — crédit acquisition',
  bankLoanAccompagnement: 'Financement bancaire — crédit accompagnement',
  bankInterestRatePct: 'Financement bancaire — taux',
  bankFileFees: 'Financement bancaire — frais de dossier',
  bankGuaranteeFees: 'Financement bancaire — frais de garantie',
};

const LATE_PENALTY_RATE_POINTS = 5;

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
    if (!assumption)
      return { assumption: null, travauxItems: null, honorairesTechniquesItems: null, saleLots: null, valuation: null, sensitivity: null, synthesis: null };
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

  /**
   * Supprime le modèle financier du dossier — l'hypothèse ET les postes libres
   * qui en dépendent (Travaux, Honoraires techniques, grille de lots), pour ne
   * pas laisser de données orphelines qui réapparaîtraient si un nouveau
   * modèle est ressaisi plus tard. L'historique des valeurs (FieldChange)
   * n'est jamais effacé — seule la donnée vivante l'est, la traçabilité reste
   * consultable dans l'onglet Décisions.
   */
  async remove(organizationId: string, dealId: string, userId: string) {
    await this.assertDeal(organizationId, dealId);
    const assumption = await this.prisma.financialAssumption.findUnique({ where: { dealId } });
    if (!assumption) return;

    const [travauxItems, honorairesTechniquesItems, saleLots] = await Promise.all([
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'TRAVAUX' } }),
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'HONORAIRES_TECHNIQUES' } }),
      this.prisma.saleLot.findMany({ where: { dealId } }),
    ]);

    await this.prisma.$transaction([
      this.prisma.costLineItem.deleteMany({ where: { dealId } }),
      this.prisma.saleLot.deleteMany({ where: { dealId } }),
      this.prisma.financialAssumption.delete({ where: { dealId } }),
    ]);

    await this.activities.log(dealId, userId, 'FINANCIAL_MODEL_UPDATED', 'Modèle financier supprimé');

    const num = FinancialModelService.num;
    await this.fieldChanges.recordDiff(
      organizationId,
      dealId,
      'FinancialAssumption',
      userId,
      Object.keys(FINANCIAL_FIELD_LABELS).map((key) => ({
        key,
        label: FINANCIAL_FIELD_LABELS[key],
        oldValue: (assumption as unknown as Record<string, unknown>)[key],
        newValue: null,
      })),
    );
    await this.fieldChanges.recordDiff(
      organizationId,
      dealId,
      'CostLineItem',
      userId,
      [...travauxItems, ...honorairesTechniquesItems].map((item) => ({
        key: item.id,
        label: `Poste "${item.label}" (supprimé — modèle financier réinitialisé)`,
        oldValue: num(item.amount),
        newValue: null,
      })),
    );
    await this.fieldChanges.recordDiff(
      organizationId,
      dealId,
      'SaleLot',
      userId,
      saleLots.map((lot) => ({
        key: `${lot.id}:salePrice`,
        label: `Lot "${lot.label}" — prix de vente (supprimé — modèle financier réinitialisé)`,
        oldValue: num(lot.salePrice),
        newValue: null,
      })),
    );
  }

  private static num(v: Prisma.Decimal | number | null | undefined): number {
    return v === null || v === undefined ? 0 : Number(v);
  }

  /**
   * Coûts de financement (LPB + banque optionnelle) — extrait de buildResponse()
   * pour être réutilisé tel quel par getBpComparison() : le financement n'est pas
   * tracé champ par champ dans l'historique des valeurs (Deal.amountTarget/
   * interestRate ne le sont pas encore), donc sa valeur actuelle sert de constante
   * des deux côtés (initial et actualisé) plutôt que d'être devinée.
   */
  private computeFinancingFees(
    assumption: AssumptionRow,
    deal: { amountTarget: Prisma.Decimal; interestRate: Prisma.Decimal | null; durationMonths: number | null },
    hasActiveHypotheque: boolean,
  ) {
    const num = FinancialModelService.num;
    const collecte = num(deal.amountTarget);
    const baseTauxPct = num(deal.interestRate);
    // Simulation "et si le projet est en retard" — +5 points sur le taux utilisé pour les
    // intérêts, pour mesurer l'impact financier réel plutôt que de juste documenter un fait.
    const tauxPctEffectif = baseTauxPct + (assumption.latePenaltyApplied ? LATE_PENALTY_RATE_POINTS : 0);
    const tauxLpb = tauxPctEffectif / 100;
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

    return {
      collecte,
      baseTauxPct,
      tauxPctEffectif,
      dureeCibleLpb,
      lpbInterestOnDurationCible,
      lpbFeesHT,
      lpbFeesTTC,
      guaranteeFeesEstimate,
      lpbTotalFees,
      lpbNetDisbursed,
      bankEnabled,
      bankLoanTotal,
      bankInterestOnDurationCible,
      bankTotalFees,
    };
  }

  private async buildResponse(
    organizationId: string,
    dealId: string,
    deal: { amountTarget: Prisma.Decimal; interestRate: Prisma.Decimal | null; durationMonths: number | null },
    assumption: AssumptionRow,
  ) {
    const [travauxItems, honorairesTechniquesItems, hasActiveHypotheque, saleLots] = await Promise.all([
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'TRAVAUX' }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'HONORAIRES_TECHNIQUES' }, orderBy: { sortOrder: 'asc' } }),
      this.prisma.guarantee.findFirst({ where: { dealId, type: 'HYPOTHEQUE', status: 'ACTIVE' } }).then(Boolean),
      this.prisma.saleLot.findMany({ where: { dealId }, orderBy: { sortOrder: 'asc' } }),
    ]);

    const num = FinancialModelService.num;

    const surface = num(assumption.surfaceSqm);
    const sellingPricePerSqm = num(assumption.sellingPricePerSqm);

    const foncierTotal = num(assumption.landPrice) + num(assumption.notaryFees);
    const travauxTotal = travauxItems.reduce((sum, item) => sum + num(item.amount), 0);
    const honorairesTechniquesItemsTotal = honorairesTechniquesItems.reduce((sum, item) => sum + num(item.amount), 0);
    const honorairesTechniquesTotal =
      num(assumption.diagnosticsCost) +
      num(assumption.insuranceCost) +
      num(assumption.propertyTaxCost) +
      num(assumption.surveyStudiesCost) +
      honorairesTechniquesItemsTotal;

    const {
      collecte,
      baseTauxPct,
      tauxPctEffectif,
      dureeCibleLpb,
      lpbInterestOnDurationCible,
      lpbFeesHT,
      lpbFeesTTC,
      guaranteeFeesEstimate,
      lpbTotalFees,
      lpbNetDisbursed,
      bankEnabled,
      bankLoanTotal,
      bankInterestOnDurationCible,
      bankTotalFees,
    } = this.computeFinancingFees(assumption, deal, hasActiveHypotheque);

    const autresFraisTotal = num(assumption.agencyFees) + num(assumption.referralFees) + num(assumption.bankMiscFees) + lpbTotalFees;

    const coutDeRevient = foncierTotal + travauxTotal + honorairesTechniquesTotal + autresFraisTotal;
    // Dès qu'au moins un lot de la grille de commercialisation est saisi, le prix de vente
    // devient la somme réelle des lots plutôt que sellingPricePerSqm × surfaceSqm (une moyenne
    // peut masquer qu'un projet n'est viable que si certains lots se vendent au-dessus du
    // marché — la grille rend ce risque visible). Fallback sur le prix moyen tant qu'aucun
    // lot n'est saisi (rétrocompatible avec les dossiers en Phase 1).
    const saleLotsTotal = saleLots.reduce((sum, lot) => sum + num(lot.salePrice), 0);
    const saleLotsSurface = saleLots.reduce((sum, lot) => sum + num(lot.surfaceSqm), 0);
    const usesSaleLots = saleLots.length > 0;
    const prixDeVente = usesSaleLots ? saleLotsTotal : sellingPricePerSqm * surface;
    const marge = prixDeVente - coutDeRevient;
    const margePct = prixDeVente > 0 ? Math.round((marge / prixDeVente) * 1000) / 10 : 0;

    const expositionFinale = coutDeRevient - bankLoanTotal - collecte;

    const ratio = (numerator: number, denominator: number): number | null => (denominator > 0 ? Math.round((numerator / denominator) * 1000) / 1000 : null);

    const synthesis = {
      foncierTotal: Math.round(foncierTotal),
      travauxTotal: Math.round(travauxTotal),
      honorairesTechniquesTotal: Math.round(honorairesTechniquesTotal),
      agencyFees: num(assumption.agencyFees),
      referralFees: num(assumption.referralFees),
      bankMiscFees: num(assumption.bankMiscFees),
      lpb: {
        collecte: Math.round(collecte),
        tauxPct: baseTauxPct,
        tauxPctEffectif,
        latePenaltyApplied: assumption.latePenaltyApplied,
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
      prixDeVenteSource: usesSaleLots ? ('LOTS' as const) : ('MOYENNE' as const),
      saleLotsSummary: usesSaleLots
        ? {
            count: saleLots.length,
            soldCount: saleLots.filter((lot) => lot.status === 'VENDU').length,
            totalSurfaceSqm: saleLotsSurface,
            totalSalePrice: Math.round(saleLotsTotal),
            avgPricePerSqm: saleLotsSurface > 0 ? Math.round(saleLotsTotal / saleLotsSurface) : null,
          }
        : null,
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
        referralFees: assumption.referralFees !== null ? Number(assumption.referralFees) : null,
        bankMiscFees: assumption.bankMiscFees !== null ? Number(assumption.bankMiscFees) : null,
        lpbFeesPctHT: assumption.lpbFeesPctHT !== null ? Number(assumption.lpbFeesPctHT) : null,
        lpbTvaApplicable: assumption.lpbTvaApplicable,
        lpbTvaRatePct: assumption.lpbTvaRatePct !== null ? Number(assumption.lpbTvaRatePct) : null,
        lpbDurationMinMonths: assumption.lpbDurationMinMonths,
        lpbDurationMaxMonths: assumption.lpbDurationMaxMonths,
        latePenaltyApplied: assumption.latePenaltyApplied,
        bankName: assumption.bankName,
        bankLoanAcquisition: assumption.bankLoanAcquisition !== null ? Number(assumption.bankLoanAcquisition) : null,
        bankLoanAccompagnement: assumption.bankLoanAccompagnement !== null ? Number(assumption.bankLoanAccompagnement) : null,
        bankInterestRatePct: assumption.bankInterestRatePct !== null ? Number(assumption.bankInterestRatePct) : null,
        bankFileFees: assumption.bankFileFees !== null ? Number(assumption.bankFileFees) : null,
        bankGuaranteeFees: assumption.bankGuaranteeFees !== null ? Number(assumption.bankGuaranteeFees) : null,
      },
      travauxItems: travauxItems.map((item) => ({ id: item.id, label: item.label, amount: Number(item.amount), sortOrder: item.sortOrder })),
      honorairesTechniquesItems: honorairesTechniquesItems.map((item) => ({ id: item.id, label: item.label, amount: Number(item.amount), sortOrder: item.sortOrder })),
      saleLots: saleLots.map((lot) => ({
        id: lot.id,
        label: lot.label,
        surfaceSqm: Number(lot.surfaceSqm),
        salePrice: Number(lot.salePrice),
        status: lot.status,
        sortOrder: lot.sortOrder,
      })),
      valuation: base,
      sensitivity,
      synthesis,
    };
  }

  /**
   * BP initial vs actualisé — reconstruit à partir de l'historique des valeurs
   * (FieldChange) plutôt que d'un snapshot dédié : pour chaque champ, la
   * première valeur jamais enregistrée sert de "BP initial", la valeur
   * actuelle de "BP actualisé". Un champ jamais modifié depuis la création du
   * modèle financier n'a pas de FieldChange — dans ce cas, initial = actuel
   * (aucune dérive n'est inventée). Le financement (LPB/bancaire) n'est pas
   * tracé champ par champ pour l'instant : il est tenu constant à sa valeur
   * actuelle des deux côtés plutôt que d'être deviné.
   */
  async getBpComparison(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    const deal = await this.prisma.deal.findUniqueOrThrow({ where: { id: dealId } });
    const assumption = await this.prisma.financialAssumption.findUnique({ where: { dealId } });
    if (!assumption) return { hasData: false, hasAnyHistory: false, earliestChangeAt: null, lines: [], disclaimer: null };

    const num = FinancialModelService.num;

    const [travauxItems, honorairesTechniquesItems, saleLots, hasActiveHypotheque, changes] = await Promise.all([
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'TRAVAUX' } }),
      this.prisma.costLineItem.findMany({ where: { dealId, category: 'HONORAIRES_TECHNIQUES' } }),
      this.prisma.saleLot.findMany({ where: { dealId } }),
      this.prisma.guarantee.findFirst({ where: { dealId, type: 'HYPOTHEQUE', status: 'ACTIVE' } }).then(Boolean),
      this.prisma.fieldChange.findMany({
        where: { dealId, entityType: { in: ['FinancialAssumption', 'CostLineItem', 'SaleLot'] } },
        orderBy: { changedAt: 'asc' },
        select: { entityType: true, fieldKey: true, oldValue: true, newValue: true, changedAt: true },
      }),
    ]);

    const earliestByKey = new Map<string, { oldValue: string | null; newValue: string | null }>();
    for (const c of changes) {
      const compositeKey = `${c.entityType}:${c.fieldKey}`;
      if (!earliestByKey.has(compositeKey)) earliestByKey.set(compositeKey, c);
    }
    const hasAnyHistory = changes.length > 0;
    const earliestChangeAt = changes[0]?.changedAt ?? null;

    const initialOf = (entityType: string, fieldKey: string, current: number): number => {
      const row = earliestByKey.get(`${entityType}:${fieldKey}`);
      if (!row) return current; // pas d'historique => aucune dérive connue, pas de valeur inventée
      return row.oldValue !== null ? Number(row.oldValue) : Number(row.newValue);
    };

    // Foncier
    const landPrice_i = initialOf('FinancialAssumption', 'landPrice', num(assumption.landPrice));
    const notaryFees_i = initialOf('FinancialAssumption', 'notaryFees', num(assumption.notaryFees));
    const foncier_i = landPrice_i + notaryFees_i;
    const foncier_c = num(assumption.landPrice) + num(assumption.notaryFees);

    // Travaux — uniquement les postes qui existent encore aujourd'hui (un
    // poste supprimé depuis n'apparaît dans aucune des deux colonnes, plutôt
    // que de deviner à quel total il appartenait).
    const travaux_i = travauxItems.reduce((sum, item) => sum + initialOf('CostLineItem', item.id, Number(item.amount)), 0);
    const travaux_c = travauxItems.reduce((sum, item) => sum + Number(item.amount), 0);

    // Honoraires techniques
    const diag_i = initialOf('FinancialAssumption', 'diagnosticsCost', num(assumption.diagnosticsCost));
    const ins_i = initialOf('FinancialAssumption', 'insuranceCost', num(assumption.insuranceCost));
    const tax_i = initialOf('FinancialAssumption', 'propertyTaxCost', num(assumption.propertyTaxCost));
    const survey_i = initialOf('FinancialAssumption', 'surveyStudiesCost', num(assumption.surveyStudiesCost));
    const honorairesItems_i = honorairesTechniquesItems.reduce((sum, item) => sum + initialOf('CostLineItem', item.id, Number(item.amount)), 0);
    const honorairesItems_c = honorairesTechniquesItems.reduce((sum, item) => sum + Number(item.amount), 0);
    const honoraires_i = diag_i + ins_i + tax_i + survey_i + honorairesItems_i;
    const honoraires_c =
      num(assumption.diagnosticsCost) + num(assumption.insuranceCost) + num(assumption.propertyTaxCost) + num(assumption.surveyStudiesCost) + honorairesItems_c;

    // Autres frais — scalaires uniquement (hors LPB/banque, voir disclaimer)
    const agency_i = initialOf('FinancialAssumption', 'agencyFees', num(assumption.agencyFees));
    const referral_i = initialOf('FinancialAssumption', 'referralFees', num(assumption.referralFees));
    const miscBank_i = initialOf('FinancialAssumption', 'bankMiscFees', num(assumption.bankMiscFees));
    const autresFrais_i = agency_i + referral_i + miscBank_i;
    const autresFrais_c = num(assumption.agencyFees) + num(assumption.referralFees) + num(assumption.bankMiscFees);

    // Prix de vente — grille de lots si utilisée, sinon prix moyen × surface
    let prixDeVente_i: number;
    let prixDeVente_c: number;
    if (saleLots.length > 0) {
      prixDeVente_i = saleLots.reduce((sum, lot) => sum + initialOf('SaleLot', `${lot.id}:salePrice`, Number(lot.salePrice)), 0);
      prixDeVente_c = saleLots.reduce((sum, lot) => sum + Number(lot.salePrice), 0);
    } else {
      const sellingPricePerSqm_i = initialOf('FinancialAssumption', 'sellingPricePerSqm', num(assumption.sellingPricePerSqm));
      const surfaceSqm_i = initialOf('FinancialAssumption', 'surfaceSqm', num(assumption.surfaceSqm));
      prixDeVente_i = sellingPricePerSqm_i * surfaceSqm_i;
      prixDeVente_c = num(assumption.sellingPricePerSqm) * num(assumption.surfaceSqm);
    }

    // Financement (LPB + banque) tenu constant à sa valeur actuelle des deux
    // côtés — Deal.amountTarget/interestRate et les champs bancaires ne sont
    // pas tracés champ par champ pour l'instant, donc aucune dérive n'y est
    // attribuée dans cette comparaison.
    const { lpbTotalFees } = this.computeFinancingFees(assumption, deal, hasActiveHypotheque);

    const coutDeRevient_i = foncier_i + travaux_i + honoraires_i + autresFrais_i + lpbTotalFees;
    const coutDeRevient_c = foncier_c + travaux_c + honoraires_c + autresFrais_c + lpbTotalFees;
    const marge_i = prixDeVente_i - coutDeRevient_i;
    const marge_c = prixDeVente_c - coutDeRevient_c;
    const margePct_i = prixDeVente_i > 0 ? Math.round((marge_i / prixDeVente_i) * 1000) / 10 : 0;
    const margePct_c = prixDeVente_c > 0 ? Math.round((marge_c / prixDeVente_c) * 1000) / 10 : 0;

    const line = (key: string, label: string, initial: number, current: number) => {
      const deltaAbs = current - initial;
      const deltaPct = initial !== 0 ? Math.round((deltaAbs / Math.abs(initial)) * 1000) / 10 : null;
      return { key, label, initial: Math.round(initial), current: Math.round(current), deltaAbs: Math.round(deltaAbs), deltaPct };
    };

    return {
      hasData: true,
      hasAnyHistory,
      earliestChangeAt,
      lines: [
        line('prixDeVente', 'Prix de vente', prixDeVente_i, prixDeVente_c),
        line('foncier', 'Foncier', foncier_i, foncier_c),
        line('travaux', 'Travaux', travaux_i, travaux_c),
        line('honorairesTechniques', 'Honoraires techniques', honoraires_i, honoraires_c),
        line('autresFrais', "Autres frais (hors financement)", autresFrais_i, autresFrais_c),
        line('coutDeRevient', 'Coût de revient', coutDeRevient_i, coutDeRevient_c),
        {
          key: 'marge',
          label: 'Marge avant impôts',
          initial: Math.round(marge_i),
          current: Math.round(marge_c),
          deltaAbs: Math.round(marge_c - marge_i),
          deltaPct: null,
          initialPct: margePct_i,
          currentPct: margePct_c,
        },
      ],
      disclaimer:
        "Le \"BP initial\" est reconstruit à partir de la première valeur jamais enregistrée pour chaque champ (historique des valeurs). Un champ jamais modifié depuis la création du modèle financier affiche la même valeur des deux côtés — aucune dérive n'est inventée. Le financement (collecte, taux, frais LPB/bancaires) n'est pas encore tracé champ par champ : il reste à sa valeur actuelle dans les deux colonnes.",
    };
  }
}
