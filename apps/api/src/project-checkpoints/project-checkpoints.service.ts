import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { FinancialModelService } from '../financial-model/financial-model.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';

@Injectable()
export class ProjectCheckpointsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly financialModel: FinancialModelService,
  ) {}

  async list(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    const checkpoints = await this.prisma.projectCheckpoint.findMany({
      where: { dealId },
      include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    return checkpoints.map((c) => this.withDeltas(c));
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateCheckpointDto) {
    await this.assertDeal(organizationId, dealId);

    // Prefill the "initial" reference values from the deal's own
    // underwriting model when the analyst doesn't override them — the
    // point is to compare against what was actually planned, not to
    // re-type numbers that already exist elsewhere in the dossier.
    let travauxBudgetInitial = dto.travauxBudgetInitial;
    let prixVenteInitialPrevu = dto.prixVenteInitialPrevu;
    if (travauxBudgetInitial === undefined || prixVenteInitialPrevu === undefined) {
      const model = await this.financialModel.get(organizationId, dealId);
      if (travauxBudgetInitial === undefined) travauxBudgetInitial = model.valuation?.totalCost;
      if (prixVenteInitialPrevu === undefined) prixVenteInitialPrevu = model.valuation?.revenue;
    }

    const checkpoint = await this.prisma.projectCheckpoint.create({
      data: {
        dealId,
        recordedById: userId,
        travauxBudgetInitial,
        travauxDepensesADate: dto.travauxDepensesADate,
        travauxTermines: dto.travauxTermines ?? false,
        commercialisationLancee: dto.commercialisationLancee ?? false,
        pourcentageVendu: dto.pourcentageVendu,
        prixVenteInitialPrevu,
        prixVenteReelADate: dto.prixVenteReelADate,
        atterrissagePrevu: dto.atterrissagePrevu,
        notes: dto.notes,
      },
      include: { recordedBy: { select: { id: true, firstName: true, lastName: true } } },
    });

    await this.activities.log(dealId, userId, 'CHECKPOINT_CREATED', 'Point à durée cible enregistré');
    return this.withDeltas(checkpoint);
  }

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  private withDeltas<
    T extends {
      travauxBudgetInitial: unknown;
      travauxDepensesADate: unknown;
      prixVenteInitialPrevu: unknown;
      prixVenteReelADate: unknown;
    },
  >(checkpoint: T) {
    const budget = checkpoint.travauxBudgetInitial !== null ? Number(checkpoint.travauxBudgetInitial) : null;
    const depenses = checkpoint.travauxDepensesADate !== null ? Number(checkpoint.travauxDepensesADate) : null;
    const prixPrevu = checkpoint.prixVenteInitialPrevu !== null ? Number(checkpoint.prixVenteInitialPrevu) : null;
    const prixReel = checkpoint.prixVenteReelADate !== null ? Number(checkpoint.prixVenteReelADate) : null;

    return {
      ...checkpoint,
      travauxBudgetInitial: budget,
      travauxDepensesADate: depenses,
      prixVenteInitialPrevu: prixPrevu,
      prixVenteReelADate: prixReel,
      deltaTravaux: budget !== null && depenses !== null ? Math.round((depenses - budget) * 100) / 100 : null,
      deltaPrix: prixPrevu !== null && prixReel !== null ? Math.round((prixReel - prixPrevu) * 100) / 100 : null,
      margeADate: prixReel !== null && depenses !== null ? Math.round((prixReel - depenses) * 100) / 100 : null,
    };
  }
}
