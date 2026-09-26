import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { DealsService } from '../deals/deals.service';
import type { CreateDealDto } from '../deals/dto/create-deal.dto';
import { ValidateCaseDto } from './dto/validate-case.dto';
import { mapLotStatus, mapProjectTypeToDealType } from './promotion.util';

interface PromotionResult {
  prequalificationId: string;
  portfolioProjectId: string | null;
  stage: 'SOURCING' | null;
  alreadyPromoted: boolean;
}

const PROMOTION_CASE_INCLUDE = {
  financial: { include: { costLineItems: true } },
  lots: true,
  project: true,
  people: true,
  companies: true,
  planning: true,
  findings: true,
  questions: true,
  evidence: true,
} satisfies Prisma.PrequalificationCaseInclude;

/**
 * Commande de validation/promotion (spec §16.1). `DealsService.create()`
 * n'est pas composable dans un `prisma.$transaction` (elle code en dur
 * `this.prisma` et enchaîne plusieurs effets non transactionnels :
 * activities.log, entityMirror.createMirror, indexForSearch, auto-link
 * SIREN — même limite que `PipelineEntry.convertToDeal`, le seul autre
 * précédent "pré-Deal → Deal" du dépôt, lui non plus pas transactionnel).
 *
 * On obtient malgré tout l'idempotence et la sûreté en cas de double-clic
 * par une paire de compare-and-swap atomiques (`updateMany` avec clause
 * `where` sur `version`/`promotedDealId`) qui encadrent la séquence de
 * création : la première CAS "réserve" le droit de promouvoir en
 * incrémentant `version` — un seul appelant peut la gagner pour un
 * `expectedVersion` donné — ce qui sérialise tout concurrent avant même la
 * création du Deal ; la seconde pose `promotedDealId` en fin de séquence.
 * Un double-clic après un premier succès ne repasse jamais la première CAS
 * (le `promotedDealId` est déjà posé) et retourne le Deal existant tel quel.
 */
@Injectable()
export class PromotionService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly deals: DealsService,
    private readonly activities: ActivitiesService,
  ) {}

  async validateAndPromote(organizationId: string, caseId: string, userId: string, dto: ValidateCaseDto): Promise<PromotionResult> {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({
      where: { id: caseId, organizationId },
      include: PROMOTION_CASE_INCLUDE,
    });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');

    // Idempotence : un double-clic après succès doit retourner le même Deal,
    // quel que soit l'expectedVersion envoyé (celui-ci reflète forcément
    // l'état d'avant la promotion, jamais l'état actuel) — vérifié AVANT le
    // contrôle de version pour rester idempotent sur un retry exact.
    if (prequalCase.promotedDealId) {
      return { prequalificationId: caseId, portfolioProjectId: prequalCase.promotedDealId, stage: 'SOURCING', alreadyPromoted: true };
    }

    if (prequalCase.version !== dto.expectedVersion) {
      throw new ConflictException('Version périmée — le dossier a été modifié depuis votre dernière lecture. Rechargez avant de revalider.');
    }

    const unresolvedBlocking = prequalCase.findings.filter((f) => f.severity === 'BLOCKING' && (f.reviewStatus === 'PENDING' || f.reviewStatus === 'ACCEPTED'));

    if (dto.orientation === 'GO' && unresolvedBlocking.length > 0) {
      throw new BadRequestException(
        `Impossible de valider en GO : ${unresolvedBlocking.length} point(s) bloquant(s) non résolu(s). Passez en GO_SOUS_CONDITIONS (chaque point devient une condition) ou statuez sur chaque finding.`,
      );
    }

    if (dto.orientation === 'WAIT' || dto.orientation === 'NO_GO_EN_L_ETAT') {
      return this.recordDecisionWithoutPromotion(prequalCase, userId, dto);
    }

    return this.promoteToPortfolio(organizationId, prequalCase, userId, dto, unresolvedBlocking);
  }

  private async recordDecisionWithoutPromotion(
    prequalCase: Prisma.PrequalificationCaseGetPayload<{ include: typeof PROMOTION_CASE_INCLUDE }>,
    userId: string,
    dto: ValidateCaseDto,
  ): Promise<PromotionResult> {
    const nextVersion = prequalCase.version + 1;
    const snapshot = this.toJsonSnapshot(prequalCase);

    // CAS (même parade que promoteToPortfolio ci-dessous) : le contrôle de
    // version au début de validateAndPromote lit un état qui peut être
    // périmé par le temps qu'on arrive ici — deux requêtes concurrentes
    // peuvent toutes deux le passer avant que l'une ou l'autre ne commite.
    // Sans cette CAS, la seconde heurtait la contrainte unique
    // (prequalificationCaseId, versionNumber) avec une erreur Prisma brute
    // (500) au lieu d'un 409 propre.
    const claim = await this.prisma.prequalificationCase.updateMany({
      where: { id: prequalCase.id, version: prequalCase.version },
      data: {
        version: nextVersion,
        orientation: dto.orientation,
        status: dto.orientation === 'WAIT' ? 'NEEDS_REVIEW' : 'ARCHIVED',
        validatedAt: new Date(),
        validatedById: userId,
      },
    });
    if (claim.count === 0) {
      throw new ConflictException('Version périmée — le dossier a été modifié depuis votre dernière lecture. Rechargez avant de revalider.');
    }

    await this.prisma.prequalificationVersion.create({
      data: {
        prequalificationCaseId: prequalCase.id,
        versionNumber: nextVersion,
        snapshot,
        orientation: dto.orientation,
        decisionComment: dto.decisionComment,
        validatedById: userId,
      },
    });

    return { prequalificationId: prequalCase.id, portfolioProjectId: null, stage: null, alreadyPromoted: false };
  }

  private async promoteToPortfolio(
    organizationId: string,
    prequalCase: Prisma.PrequalificationCaseGetPayload<{ include: typeof PROMOTION_CASE_INCLUDE }>,
    userId: string,
    dto: ValidateCaseDto,
    unresolvedBlocking: Prisma.PrequalificationCaseGetPayload<{ include: typeof PROMOTION_CASE_INCLUDE }>['findings'],
  ): Promise<PromotionResult> {
    if (prequalCase.financial?.amountRequested == null) {
      throw new BadRequestException('Le montant recherché (bilan financier) doit être renseigné avant de promouvoir le dossier.');
    }

    const claim = await this.prisma.prequalificationCase.updateMany({
      where: { id: prequalCase.id, version: dto.expectedVersion, promotedDealId: null },
      data: { version: { increment: 1 } },
    });
    if (claim.count === 0) {
      const fresh = await this.prisma.prequalificationCase.findUnique({ where: { id: prequalCase.id }, select: { promotedDealId: true } });
      if (fresh?.promotedDealId) {
        return { prequalificationId: prequalCase.id, portfolioProjectId: fresh.promotedDealId, stage: 'SOURCING', alreadyPromoted: true };
      }
      throw new ConflictException('Version périmée — le dossier a été modifié depuis votre dernière lecture. Rechargez avant de revalider.');
    }

    const dealDto: CreateDealDto = {
      name: prequalCase.name,
      type: mapProjectTypeToDealType(prequalCase.projectType),
      description: prequalCase.project?.description ?? undefined,
      amountTarget: Number(prequalCase.financial.amountRequested),
      address: prequalCase.project?.address ?? undefined,
      city: prequalCase.project?.city ?? undefined,
      postcode: prequalCase.project?.postcode ?? undefined,
    };
    const deal = await this.deals.create(organizationId, userId, dealDto);

    if (prequalCase.financial.costLineItems.length > 0) {
      await this.prisma.costLineItem.createMany({
        data: prequalCase.financial.costLineItems.map((item) => ({
          dealId: deal.id,
          category: item.category,
          label: item.label,
          amount: item.amount,
          sortOrder: item.sortOrder,
        })),
      });
    }

    // Un lot sans surface ou sans prix (attendu ou affiché) n'est jamais
    // copié avec une valeur inventée (doctrine "Unknown ≠ Zero") — il reste
    // uniquement dans l'historique de préqualification (snapshot ci-dessous).
    const lotsToCopy = prequalCase.lots.filter((lot) => lot.surfaceSqm !== null && (lot.expectedPrice !== null || lot.askingPrice !== null));
    if (lotsToCopy.length > 0) {
      await this.prisma.saleLot.createMany({
        data: lotsToCopy.map((lot) => ({
          dealId: deal.id,
          label: lot.label,
          surfaceSqm: lot.surfaceSqm!,
          salePrice: (lot.expectedPrice ?? lot.askingPrice)!,
          status: mapLotStatus(lot.status),
          sortOrder: lot.sortOrder,
        })),
      });
    }
    const skippedLotsCount = prequalCase.lots.length - lotsToCopy.length;

    if (dto.orientation === 'GO_SOUS_CONDITIONS') {
      for (const finding of unresolvedBlocking) {
        await this.prisma.portfolioMilestone.create({
          data: { dealId: deal.id, label: finding.statement, description: finding.rationale, blocking: true, sourceFindingId: finding.id },
        });
      }
    }

    const nextVersion = prequalCase.version + 1;
    const snapshot = this.toJsonSnapshot(prequalCase);
    await this.prisma.prequalificationVersion.create({
      data: {
        prequalificationCaseId: prequalCase.id,
        versionNumber: nextVersion,
        snapshot,
        orientation: dto.orientation,
        decisionComment: dto.decisionComment,
        validatedById: userId,
      },
    });

    // Écriture terminale, pas une seconde course : la CAS ci-dessus a déjà
    // sérialisé les tentatives concurrentes pour cet expectedVersion, seul
    // l'appelant qui l'a gagnée atteint ce point.
    await this.prisma.prequalificationCase.update({
      where: { id: prequalCase.id },
      data: {
        status: 'VALIDATED',
        orientation: dto.orientation,
        promotedDealId: deal.id,
        promotedVersionNumber: nextVersion,
        validatedAt: new Date(),
        validatedById: userId,
      },
    });

    await this.activities.log(
      deal.id,
      userId,
      'PREQUALIFICATION_PROMOTED',
      `Dossier promu depuis la préqualification « ${prequalCase.name} »${skippedLotsCount > 0 ? ` — ${skippedLotsCount} lot(s) non copié(s) (surface ou prix manquant)` : ''}.`,
    );

    return { prequalificationId: prequalCase.id, portfolioProjectId: deal.id, stage: 'SOURCING', alreadyPromoted: false };
  }

  /** JSON-safe (Decimal → string via Decimal.toJSON, Date → ISO) — même pattern que les autres snapshots Json du dépôt. */
  private toJsonSnapshot(data: unknown): Prisma.InputJsonValue {
    return JSON.parse(JSON.stringify(data)) as Prisma.InputJsonValue;
  }
}
