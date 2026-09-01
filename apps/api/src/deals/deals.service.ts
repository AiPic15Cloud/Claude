import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { TasksService } from '../tasks/tasks.service';
import { GeocodingService } from './geocoding.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { computeDeadlineAlert } from './deadline.util';
import { computeDurationTargetAlert } from './duration-target.util';
import { computeNewsletterStatus } from './newsletter.util';
import { buildMiseEnDemeure } from './mise-en-demeure.util';
import { computeCheckpointHealth } from './checkpoint-health.util';
import { withNoteImageUrls } from '../notes/note-image.util';
import { StorageService } from '../common/storage/storage.service';
import { isDealClosed } from '../common/deal-lifecycle.util';
import { RiskEngineService } from '../risk-engine/risk-engine.service';
import { FieldChangeService } from '../field-changes/field-change.service';
import { GraphService } from '../graph/graph.service';
import { EntityMirrorService } from '../entity-graph/entity-mirror.service';
import { PlaybooksService } from '../playbooks/playbooks.service';
import { computeCrd, computeCrdDetailed } from './crd.util';
import { isMonitoringSuppressedByStatus } from './deal-consistency.util';
import { computeLoanLifecycle, type LoanLifecycleTerminal } from './loan-lifecycle.util';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';

// Fixed, never-translated title so the daily check can recognize its own
// previously-created reminder and never duplicate it — see
// createOverdueNewsletterTasks() below.
const NEWSLETTER_TASK_TITLE = 'Newsletter investisseurs à envoyer';

function computeFeesAmount(feesRate: number | null | undefined, amountRaised: number): number {
  if (!feesRate) return 0;
  return Math.round(((feesRate / 100) * amountRaised + Number.EPSILON) * 100) / 100;
}

const DEAL_INCLUDE = {
  tags: { include: { tag: true } },
  createdBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  assignedTo: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  _count: { select: { notes: true, documents: true, tasks: true } },
} satisfies Prisma.DealInclude;

@Injectable()
export class DealsService {
  private readonly logger = new Logger(DealsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly search: MeilisearchService,
    private readonly geocoding: GeocodingService,
    private readonly tasks: TasksService,
    private readonly storage: StorageService,
    private readonly riskEngine: RiskEngineService,
    private readonly fieldChanges: FieldChangeService,
    private readonly graph: GraphService,
    private readonly entityMirror: EntityMirrorService,
    private readonly playbooks: PlaybooksService,
  ) {}

  /** Only geocodes when the client didn't already supply coordinates and there's an address to resolve. */
  private async resolveCoordinates(
    lat: number | undefined,
    lng: number | undefined,
    location: { address?: string | null; city?: string | null; postcode?: string | null },
  ): Promise<{ lat?: number; lng?: number }> {
    if (lat !== undefined || lng !== undefined) return { lat, lng };
    if (!location.address && !location.city) return {};
    const result = await this.geocoding.geocode(location);
    return result ? { lat: result.lat, lng: result.lng } : {};
  }

  private toCheckpointHealth(
    checkpoint: {
      travauxBudgetInitial: Prisma.Decimal | null;
      travauxDepensesADate: Prisma.Decimal | null;
      prixVenteInitialPrevu: Prisma.Decimal | null;
      prixVenteReelADate: Prisma.Decimal | null;
      createdAt: Date;
    } | null,
    suppressed = false,
  ) {
    // Repaid or defaulted deals are closed out — a budget/price deviation
    // signal has nothing left to act on, so it's dropped rather than kept
    // showing a stale ORANGE/ROUGE dot.
    if (suppressed) return { level: null, reasons: [], checkpointDate: checkpoint?.createdAt ?? null };
    return computeCheckpointHealth(
      checkpoint
        ? {
            travauxBudgetInitial: checkpoint.travauxBudgetInitial !== null ? Number(checkpoint.travauxBudgetInitial) : null,
            travauxDepensesADate: checkpoint.travauxDepensesADate !== null ? Number(checkpoint.travauxDepensesADate) : null,
            prixVenteInitialPrevu: checkpoint.prixVenteInitialPrevu !== null ? Number(checkpoint.prixVenteInitialPrevu) : null,
            prixVenteReelADate: checkpoint.prixVenteReelADate !== null ? Number(checkpoint.prixVenteReelADate) : null,
            createdAt: checkpoint.createdAt,
          }
        : null,
    );
  }

  /** Batch equivalent of toCheckpointHealth() for list endpoints — one query for the latest checkpoint of every deal in the page, instead of N+1. */
  private async attachCheckpointHealth<T extends { id: string; repaid: boolean; stage: string }>(deals: T[]) {
    if (deals.length === 0) return deals as (T & { checkpointHealth: ReturnType<typeof computeCheckpointHealth> })[];
    const checkpoints = await this.prisma.projectCheckpoint.findMany({
      where: { dealId: { in: deals.map((d) => d.id) } },
      orderBy: { createdAt: 'desc' },
    });
    const latestByDeal = new Map<string, (typeof checkpoints)[number]>();
    for (const c of checkpoints) {
      if (!latestByDeal.has(c.dealId)) latestByDeal.set(c.dealId, c);
    }
    return deals.map((d) => ({
      ...d,
      checkpointHealth: this.toCheckpointHealth(latestByDeal.get(d.id) ?? null, isDealClosed(d)),
    }));
  }

  /**
   * Batch equivalent of computeCrd() for list endpoints — one groupBy for
   * every deal in the page instead of N+1. The CRD itself is never stored
   * (see crd.util.ts) : always derived from amountRaised + realized
   * repayments at read time, exactly like checkpointHealth/deadlineAlert.
   */
  private async attachCrd<T extends { id: string; amountRaised: Prisma.Decimal | number }>(deals: T[]) {
    if (deals.length === 0) return deals as (T & { crd: number })[];
    const sums = await this.prisma.repayment.groupBy({
      by: ['dealId'],
      where: { dealId: { in: deals.map((d) => d.id) }, projected: false },
      _sum: { amount: true },
    });
    const realizedByDeal = new Map(sums.map((s) => [s.dealId, Number(s._sum.amount ?? 0)]));
    return deals.map((d) => ({
      ...d,
      crd: computeCrd(Number(d.amountRaised), realizedByDeal.get(d.id) ?? 0),
    }));
  }

  private indexForSearch(deal: { id: string; organizationId: string; name: string; reference: string; type: string; stage: string; city: string | null }) {
    void this.search.indexDeal({
      id: deal.id,
      organizationId: deal.organizationId,
      name: deal.name,
      reference: deal.reference,
      type: deal.type,
      stage: deal.stage,
      city: deal.city,
    });
  }

  // A prior read-then-increment scheme (compute "current max", add one) is
  // inherently racy: any two concurrent creates can read the same max
  // before either commits, then both retry from that same stale reading —
  // no amount of retrying escapes that, since a failed insert never
  // changes what "max" resolves to. A single atomic SQL upsert against a
  // per-(org, year) counter closes the race entirely, at any concurrency.
  //
  // The counter can still legitimately fall behind the deals table itself
  // (e.g. it was bootstrapped from a stale/partial max, or rows landed in
  // the table outside this path) — plain "+1 every call" can never recover
  // from that, it just walks forward one collision at a time. GREATEST(...)
  // makes every call self-healing: it re-checks the true max on every
  // invocation and jumps the counter past it if it's ever behind, not only
  // when the row is first created.
  private async nextReference(organizationId: string): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `ATL-${year}-`;

    const seedRow = await this.prisma.deal.findFirst({
      where: { organizationId, reference: { startsWith: prefix } },
      orderBy: { reference: 'desc' },
      select: { reference: true },
    });
    const seed = seedRow ? parseInt(seedRow.reference.slice(prefix.length), 10) || 0 : 0;

    const rows = await this.prisma.$queryRaw<{ value: number }[]>`
      INSERT INTO reference_counters ("organizationId", "year", "value")
      VALUES (${organizationId}, ${year}, ${seed + 1})
      ON CONFLICT ("organizationId", "year")
      DO UPDATE SET "value" = GREATEST(reference_counters."value" + 1, ${seed + 1})
      RETURNING "value"
    `;
    const value = rows[0].value;
    this.logger.debug(`nextReference org=${organizationId} year=${year} seed=${seed} -> value=${value}`);
    return `${prefix}${String(value).padStart(4, '0')}`;
  }

  async create(organizationId: string, userId: string, dto: CreateDealDto) {
    const { tagIds, startDate, endDate, dateMin, dateCible, dateMax, lastNewsletterDate, feesRate, amountRaised, lat, lng, ...rest } = dto;
    const coords = await this.resolveCoordinates(lat, lng, { address: rest.address, city: rest.city, postcode: rest.postcode });
    const data = {
      ...rest,
      ...coords,
      amountRaised,
      feesRate,
      feesAmount: computeFeesAmount(feesRate, amountRaised ?? 0),
      organizationId,
      createdById: userId,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      dateMin: dateMin ? new Date(dateMin) : undefined,
      dateCible: dateCible ? new Date(dateCible) : undefined,
      dateMax: dateMax ? new Date(dateMax) : undefined,
      lastNewsletterDate: lastNewsletterDate ? new Date(lastNewsletterDate) : undefined,
      tags: tagIds?.length ? { create: tagIds.map((tagId) => ({ tagId })) } : undefined,
    };

    // Belt and braces: the counter is atomic so this shouldn't collide, but
    // if it's ever behind the actual max (e.g. rows inserted outside this
    // path), each retry pulls a fresh atomic increment — never the same
    // stale candidate twice — guaranteeing forward progress either way.
    let deal;
    for (let attempt = 0; attempt < 5; attempt++) {
      const reference = await this.nextReference(organizationId);
      try {
        deal = await this.prisma.deal.create({ data: { ...data, reference }, include: DEAL_INCLUDE });
        break;
      } catch (error) {
        const isUniqueClash = (error as { code?: string })?.code === 'P2002';
        if (isUniqueClash) {
          // Deliberately not logging the existing deal's name here: it may
          // belong to a different organization than the one retrying, and
          // this line ends up in a shared log stream.
          const existing = await this.prisma.deal.findUnique({ where: { reference }, select: { id: true, createdAt: true } });
          this.logger.warn(
            `reference clash on attempt ${attempt} org=${organizationId} reference=${reference} existingDealId=${existing?.id} existingCreatedAt=${existing?.createdAt?.toISOString()}`,
          );
        }
        if (!isUniqueClash || attempt === 4) throw error;
      }
    }

    await this.activities.log(deal!.id, userId, 'DEAL_CREATED', `Opération créée : ${deal!.name}`);
    await this.entityMirror.createMirror(organizationId, deal!.id, deal!.name, deal!.reference);
    this.indexForSearch(deal!);
    if (deal!.porteurSiren) {
      const linked = await this.graph.autoLinkPromoteurBySiren(organizationId, deal!.id, deal!.porteurSiren);
      if (linked) await this.activities.log(deal!.id, userId, 'ENTITY_LINKED', 'Porteur lié automatiquement via SIREN');
    }
    return {
      ...deal!,
      deadlineAlert: computeDeadlineAlert(deal!.dateMax, new Date(), isDealClosed(deal!)),
      durationTargetAlert: computeDurationTargetAlert(deal!.startDate, deal!.durationMonths, new Date(), isDealClosed(deal!)),
    };
  }

  async findAll(organizationId: string, query: QueryDealsDto) {
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 50;

    const where: Prisma.DealWhereInput = {
      organizationId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.stage?.length ? { stage: { in: query.stage } } : {}),
      ...(query.type?.length ? { type: { in: query.type } } : {}),
      ...(query.tagIds?.length ? { tags: { some: { tagId: { in: query.tagIds } } } } : {}),
      ...(query.late ? { dateMax: { lt: new Date() }, repaid: false, stage: { not: 'DEFAUT' } } : {}),
      ...(query.search
        ? {
            OR: [
              { name: { contains: query.search, mode: 'insensitive' } },
              { reference: { contains: query.search, mode: 'insensitive' } },
              { city: { contains: query.search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [items, total] = await this.prisma.$transaction([
      this.prisma.deal.findMany({
        where,
        include: DEAL_INCLUDE,
        orderBy: { [query.sortBy ?? 'createdAt']: query.sortOrder ?? 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.deal.count({ where }),
    ]);

    const withHealth = await this.attachCheckpointHealth(items);
    const withCrd = await this.attachCrd(withHealth);

    return {
      items: withCrd.map((d) => ({
        ...d,
        deadlineAlert: computeDeadlineAlert(d.dateMax, new Date(), isDealClosed(d)),
        durationTargetAlert: computeDurationTargetAlert(d.startDate, d.durationMonths, new Date(), isDealClosed(d)),
      })),
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  async findOne(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: {
        ...DEAL_INCLUDE,
        notes: {
          include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } }, images: true },
          orderBy: { createdAt: 'desc' },
        },
        tasks: { orderBy: { dueDate: 'asc' } },
        documents: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
          orderBy: { createdAt: 'desc' },
        },
        checkpoints: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    const checkpointHealth = this.toCheckpointHealth(deal.checkpoints[0] ?? null, isDealClosed(deal));
    const notes = await Promise.all(deal.notes.map((note) => withNoteImageUrls(note, this.storage)));
    const deadlineAlert = computeDeadlineAlert(deal.dateMax, new Date(), isDealClosed(deal));
    const durationTargetAlert = computeDurationTargetAlert(deal.startDate, deal.durationMonths, new Date(), isDealClosed(deal));
    const realizedRepayments = await this.prisma.repayment.findMany({
      where: { dealId: id, projected: false },
      select: { date: true, amount: true },
    });
    const crdDetailed = computeCrdDetailed(
      Number(deal.amountRaised),
      deal.interestRate ? Number(deal.interestRate) : null,
      deal.startDate,
      realizedRepayments.map((r) => ({ date: r.date, amount: Number(r.amount) })),
    );
    return {
      ...deal,
      crd: crdDetailed.crdCapital,
      crdInteretsCourus: crdDetailed.crdInteretsCourus,
      crdTotal: crdDetailed.crdTotal,
      notes,
      deadlineAlert,
      durationTargetAlert,
      checkpointHealth,
    };
  }

  async generateMiseEnDemeure(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id, organizationId },
      include: { organization: { select: { name: true } } },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');
    if (!deal.porteurNom || !deal.porteurAdresse) {
      throw new BadRequestException(
        "Coordonnées du porteur de projet manquantes — renseignez son nom et son adresse depuis \"Modifier\" avant de générer la mise en demeure.",
      );
    }

    return buildMiseEnDemeure({
      organizationName: deal.organization.name,
      dealName: deal.name,
      dealReference: deal.reference,
      porteurNom: deal.porteurNom,
      porteurSociete: deal.porteurSociete,
      porteurAdresse: deal.porteurAdresse,
      dateMax: deal.dateMax,
    });
  }

  async update(organizationId: string, id: string, userId: string, dto: UpdateDealDto) {
    await this.assertExists(organizationId, id);
    const { tagIds, startDate, endDate, dateMin, dateCible, dateMax, lastNewsletterDate, feesRate, amountRaised, stage, lat, lng, porteurSiren, ...rest } = dto;
    const normalizedPorteurSiren = porteurSiren === '' ? null : porteurSiren;

    const current = await this.prisma.deal.findUnique({
      where: { id },
      select: {
        stage: true,
        name: true,
        feesRate: true,
        amountRaised: true,
        amountTarget: true,
        interestRate: true,
        durationMonths: true,
        dateMin: true,
        dateCible: true,
        dateMax: true,
        address: true,
        city: true,
        postcode: true,
        lat: true,
        lng: true,
        porteurSiren: true,
        porteurNom: true,
        porteurSociete: true,
        porteurAdresse: true,
        recoveryStatus: true,
        repaid: true,
        chantierSignaleArret: true,
        status: true,
      },
    });

    // Changer le SIREN suivi doit repartir d'un statut vierge — comparer le
    // statut de la nouvelle société à celui mémorisé pour l'ancienne aurait
    // pu masquer une première alerte légitime.
    const sirenChanged = normalizedPorteurSiren !== undefined && normalizedPorteurSiren !== current?.porteurSiren;

    // Étape REMBOURSE et booléen repaid sont deux représentations de "ce
    // dossier est terminé" qui peuvent diverger si un seul des deux est
    // modifié (ex. faire passer l'étape à REMBOURSE sans cocher le
    // toggle "Remboursé") — toutes les requêtes qui filtrent sur
    // repaid:false (alertes d'échéance, Risk Engine, agrégats Cockpit)
    // continueraient alors de suivre un dossier en réalité clos, et les
    // badges affichent une incohérence ("Remboursé" + "En cours"). On
    // aligne automatiquement l'autre champ quand un seul des deux vient
    // de changer.
    let normalizedStage = stage;
    let normalizedRepaid = rest.repaid;
    if (current) {
      // "Non touché" veut dire soit absent du payload, soit renvoyé identique à la
      // valeur actuelle (un formulaire qui resoumet l'état complet à chaque fois).
      const repaidUntouched = normalizedRepaid === undefined || normalizedRepaid === current.repaid;
      const stageUntouched = normalizedStage === undefined || normalizedStage === current.stage;
      if (normalizedStage === 'REMBOURSE' && current.stage !== 'REMBOURSE' && repaidUntouched) {
        normalizedRepaid = true;
      } else if (normalizedRepaid === true && current.repaid !== true && stageUntouched) {
        normalizedStage = 'REMBOURSE';
      }
    }

    let coords: { lat?: number; lng?: number } = { lat, lng };
    const addressChanged = rest.address !== undefined || rest.city !== undefined || rest.postcode !== undefined;
    const missingCoords = current ? current.lat === null && current.lng === null : false;
    if (lat === undefined && lng === undefined && (addressChanged || missingCoords)) {
      coords = await this.resolveCoordinates(undefined, undefined, {
        address: rest.address ?? current?.address,
        city: rest.city ?? current?.city,
        postcode: rest.postcode ?? current?.postcode,
      });
    }

    if (normalizedStage && current && current.stage !== normalizedStage) {
      await this.activities.log(id, userId, 'STAGE_CHANGED', `Étape modifiée : ${current.stage} → ${normalizedStage}`);
    }
    if (rest.recoveryStatus && current && current.recoveryStatus !== rest.recoveryStatus) {
      await this.activities.log(
        id,
        userId,
        'RECOVERY_STATUS_CHANGED',
        `Statut de recouvrement modifié : ${current.recoveryStatus} → ${rest.recoveryStatus}`,
      );
    }
    if (rest.status && current && current.status !== rest.status) {
      await this.activities.log(id, userId, 'STATUS_CHANGED', `Statut modifié : ${current.status} → ${rest.status}`);
    }
    if (dateMax && current?.dateMax && new Date(dateMax).getTime() !== current.dateMax.getTime()) {
      await this.activities.log(
        id,
        userId,
        'DEAL_UPDATED',
        `Échéance prolongée : ${current.dateMax.toLocaleDateString('fr-FR')} → ${new Date(dateMax).toLocaleDateString('fr-FR')}`,
      );
    }

    const nextFeesRate = feesRate !== undefined ? feesRate : current ? Number(current.feesRate ?? 0) : 0;
    const nextAmountRaised = amountRaised !== undefined ? amountRaised : current ? Number(current.amountRaised) : 0;

    const deal = await this.prisma.deal.update({
      where: { id },
      data: {
        ...rest,
        ...coords,
        porteurSiren: normalizedPorteurSiren,
        porteurMonitoringStatus: sirenChanged ? null : undefined,
        amountRaised,
        feesRate,
        feesAmount: computeFeesAmount(nextFeesRate, nextAmountRaised),
        stage: normalizedStage,
        repaid: normalizedRepaid,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        dateMin: dateMin ? new Date(dateMin) : undefined,
        dateCible: dateCible ? new Date(dateCible) : undefined,
        dateMax: dateMax ? new Date(dateMax) : undefined,
        lastNewsletterDate: lastNewsletterDate ? new Date(lastNewsletterDate) : undefined,
        tags: tagIds
          ? {
              deleteMany: {},
              create: tagIds.map((tagId) => ({ tagId })),
            }
          : undefined,
      },
      include: DEAL_INCLUDE,
    });

    await this.activities.log(id, userId, 'DEAL_UPDATED', 'Opération mise à jour');
    if (current && current.name !== deal.name) {
      await this.entityMirror.syncMirror(id, deal.name, deal.reference);
    }
    this.indexForSearch(deal);

    // Registre d'audit structuré par champ — distinct de l'Activity ci-dessus
    // (fil narratif) : ici, chaque champ à fort enjeu réellement modifié par
    // ce PATCH devient une ligne comparable (ancienne/nouvelle valeur, qui,
    // quand), pour la gouvernance de la donnée plutôt que la lecture humaine.
    if (current) {
      await this.fieldChanges.recordDiff(organizationId, id, 'Deal', userId, [
        { key: 'status', label: 'Statut', oldValue: current.status, newValue: deal.status },
        { key: 'name', label: 'Nom', oldValue: current.name, newValue: deal.name },
        { key: 'interestRate', label: "Taux d'intérêt", oldValue: current.interestRate, newValue: deal.interestRate },
        { key: 'amountTarget', label: 'Montant cible', oldValue: current.amountTarget, newValue: deal.amountTarget },
        { key: 'durationMonths', label: 'Durée (mois)', oldValue: current.durationMonths, newValue: deal.durationMonths },
        { key: 'dateMin', label: 'Échéance min', oldValue: current.dateMin, newValue: deal.dateMin },
        { key: 'dateCible', label: 'Échéance cible', oldValue: current.dateCible, newValue: deal.dateCible },
        { key: 'dateMax', label: 'Échéance max', oldValue: current.dateMax, newValue: deal.dateMax },
        { key: 'porteurNom', label: 'Porteur — nom', oldValue: current.porteurNom, newValue: deal.porteurNom },
        { key: 'porteurSociete', label: 'Porteur — société', oldValue: current.porteurSociete, newValue: deal.porteurSociete },
        { key: 'porteurAdresse', label: 'Porteur — adresse', oldValue: current.porteurAdresse, newValue: deal.porteurAdresse },
        { key: 'address', label: 'Adresse', oldValue: current.address, newValue: deal.address },
        { key: 'city', label: 'Ville', oldValue: current.city, newValue: deal.city },
        { key: 'postcode', label: 'Code postal', oldValue: current.postcode, newValue: deal.postcode },
      ]);
    }

    // Ces cinq champs sont les entrées du Risk Engine qui ne passent pas
    // déjà par un déclencheur dédié (checkpoint, garantie, surveillance
    // société) — recalculer seulement quand l'un d'eux a réellement changé
    // évite un aller-retour Prisma superflu sur chaque édition de dossier.
    const recoveryStatusChanged = rest.recoveryStatus !== undefined && rest.recoveryStatus !== current?.recoveryStatus;
    const repaidChanged = rest.repaid !== undefined && rest.repaid !== current?.repaid;
    const stageChanged = stage !== undefined && stage !== current?.stage;
    const dateMaxChanged = dateMax !== undefined && (dateMax ? new Date(dateMax).getTime() : null) !== (current?.dateMax?.getTime() ?? null);
    const chantierSignaleArretChanged = rest.chantierSignaleArret !== undefined && rest.chantierSignaleArret !== current?.chantierSignaleArret;
    if (recoveryStatusChanged || repaidChanged || stageChanged || dateMaxChanged || chantierSignaleArretChanged) {
      await this.riskEngine
        .recomputeAndPersist(organizationId, id)
        .catch((err) => this.logger.error(`Échec du recalcul de risque pour le deal ${id}`, err instanceof Error ? err.stack : err));
    }

    if (recoveryStatusChanged && rest.recoveryStatus === 'PROCEDURE_COLLECTIVE') {
      await this.playbooks
        .triggerProcedureCollective(organizationId, id, 'recovery_status_manuel')
        .catch((err) => this.logger.error(`Échec du déclenchement du playbook procédure collective pour le deal ${id}`, err instanceof Error ? err.stack : err));
    }

    if (sirenChanged && deal.porteurSiren) {
      const linked = await this.graph.autoLinkPromoteurBySiren(organizationId, id, deal.porteurSiren);
      if (linked) await this.activities.log(id, userId, 'ENTITY_LINKED', 'Porteur lié automatiquement via SIREN');
    }

    return {
      ...deal,
      deadlineAlert: computeDeadlineAlert(deal.dateMax, new Date(), isDealClosed(deal)),
      durationTargetAlert: computeDurationTargetAlert(deal.startDate, deal.durationMonths, new Date(), isDealClosed(deal)),
    };
  }

  async changeStage(organizationId: string, id: string, userId: string, stage: Prisma.DealUpdateInput['stage']) {
    return this.update(organizationId, id, userId, { stage } as UpdateDealDto);
  }

  async setTags(organizationId: string, id: string, userId: string, tagIds: string[]) {
    await this.assertExists(organizationId, id);
    await this.prisma.dealTag.deleteMany({ where: { dealId: id } });
    if (tagIds.length) {
      // Without this, a tagId from another organization would silently link —
      // and then render that foreign tag's name/colour on this deal.
      const ownedTagIds = await this.prisma.tag.findMany({
        where: { id: { in: tagIds }, organizationId },
        select: { id: true },
      });
      await this.prisma.dealTag.createMany({ data: ownedTagIds.map(({ id: tagId }) => ({ dealId: id, tagId })) });
    }
    await this.activities.log(id, userId, 'TAG_ADDED', 'Tags mis à jour');
    return this.findOne(organizationId, id);
  }

  async remove(organizationId: string, id: string) {
    await this.assertExists(organizationId, id);
    await this.prisma.deal.delete({ where: { id } });
    void this.search.removeDeal(id);
  }

  async kpis(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, status: 'ACTIVE' },
      select: {
        id: true,
        amountTarget: true,
        amountRaised: true,
        stage: true,
        type: true,
        interestRate: true,
        dateMax: true,
        repaid: true,
        porteurSiren: true,
        porteurSociete: true,
        surveillanceStatus: true,
        city: true,
      },
    });

    const realized = await this.prisma.repayment.groupBy({
      by: ['dealId'],
      where: { dealId: { in: deals.map((d) => d.id) }, projected: false },
      _sum: { amount: true },
    });
    const realizedByDeal = new Map(realized.map((r) => [r.dealId, Number(r._sum.amount ?? 0)]));
    const crdByDeal = new Map(deals.map((d) => [d.id, computeCrd(Number(d.amountRaised), realizedByDeal.get(d.id) ?? 0)]));

    const totalAum = deals.reduce((sum, d) => sum + Number(d.amountTarget), 0);
    const totalRaised = deals.reduce((sum, d) => sum + Number(d.amountRaised), 0);
    const totalCrd = deals.reduce((sum, d) => sum + (crdByDeal.get(d.id) ?? 0), 0);
    const avgRate =
      deals.filter((d) => d.interestRate).reduce((sum, d) => sum + Number(d.interestRate), 0) /
      (deals.filter((d) => d.interestRate).length || 1);

    const byStage: Record<string, number> = {};
    for (const d of deals) byStage[d.stage] = (byStage[d.stage] ?? 0) + 1;

    const byType: Record<string, number> = {};
    for (const d of deals) byType[d.type] = (byType[d.type] ?? 0) + 1;

    // Exposition par typologie — somme du CRD, pas un comptage (byType
    // ci-dessus ne dit rien du montant, seulement du nombre de dossiers).
    const exposureByType: Record<string, number> = {};
    for (const d of deals) exposureByType[d.type] = (exposureByType[d.type] ?? 0) + (crdByDeal.get(d.id) ?? 0);

    // Concentration par opérateur — un dossier sans porteurSiren est
    // regroupé sous une entrée explicite "Non renseigné", jamais fusionné
    // silencieusement avec un vrai SIREN (l'absence d'information n'est
    // jamais neutre).
    const byOperator = new Map<string, { porteurSiren: string | null; porteurSociete: string | null; crd: number; dealCount: number }>();
    for (const d of deals) {
      const key = d.porteurSiren ?? '__UNKNOWN__';
      const entry = byOperator.get(key) ?? { porteurSiren: d.porteurSiren, porteurSociete: d.porteurSociete, crd: 0, dealCount: 0 };
      entry.crd += crdByDeal.get(d.id) ?? 0;
      entry.dealCount += 1;
      if (!entry.porteurSociete && d.porteurSociete) entry.porteurSociete = d.porteurSociete;
      byOperator.set(key, entry);
    }
    const topOperatorConcentration = [...byOperator.values()].sort((a, b) => b.crd - a.crd).slice(0, 5);
    await this.enrichConcentrationWithGroupEconomique(organizationId, topOperatorConcentration);

    // Exposition par palier de risque (spec ATLAS v2, A.8) — un dossier
    // sans score n'est jamais fusionné sous un vrai palier, il a sa propre
    // entrée NON_CALCULE (doctrine section 0 : l'absence n'est pas neutre).
    const exposureByRiskTier: Record<string, number> = {};
    for (const d of deals) {
      const tier = d.surveillanceStatus ?? 'NON_CALCULE';
      exposureByRiskTier[tier] = (exposureByRiskTier[tier] ?? 0) + (crdByDeal.get(d.id) ?? 0);
    }

    // Exposition géographique — même principe : ville non renseignée regroupée explicitement.
    const byCity = new Map<string, number>();
    for (const d of deals) {
      const key = d.city ?? 'Non renseignée';
      byCity.set(key, (byCity.get(key) ?? 0) + (crdByDeal.get(d.id) ?? 0));
    }
    const exposureByCity = [...byCity.entries()]
      .map(([city, crd]) => ({ city, crd }))
      .sort((a, b) => b.crd - a.crd)
      .slice(0, 8);

    // Stress test simple (A.8) : "impact portefeuille si X% des dossiers
    // ÉLEVÉ basculent en défaut" — littéral, pas CRITIQUE (déjà proche du
    // défaut par construction du palier). Taux illustratif fixe, pas un
    // modèle de risque de crédit.
    const STRESS_ASSUMED_DEFAULT_RATE = 0.3;
    const eleveExposure = exposureByRiskTier['ELEVE'] ?? 0;
    const stressTest = {
      eleveExposure,
      assumedDefaultRate: STRESS_ASSUMED_DEFAULT_RATE,
      potentialLoss: Math.round(eleveExposure * STRESS_ASSUMED_DEFAULT_RATE),
    };

    const now = new Date();
    const lateDeals = deals.filter((d) => !isDealClosed(d) && d.dateMax && d.dateMax < now).length;

    // Dossiers réellement actifs (isDealClosed() = false) mais dont le
    // status a été mis manuellement hors ACTIVE — un angle mort invisible
    // aujourd'hui sur le monitoring de fond (voir deal-consistency.util.ts).
    // Nécessite une requête séparée : les dossiers ci-dessus sont déjà
    // filtrés sur status: 'ACTIVE'.
    const nonActiveDeals = await this.prisma.deal.findMany({
      where: { organizationId, status: { not: 'ACTIVE' } },
      select: { status: true, repaid: true, stage: true },
    });
    const statusMonitoringGaps = nonActiveDeals.filter(isMonitoringSuppressedByStatus).length;

    return {
      activeDeals: deals.length,
      totalAum,
      totalRaised,
      totalCrd,
      fundingProgress: totalAum > 0 ? Math.round((totalRaised / totalAum) * 100) : 0,
      averageInterestRate: Math.round(avgRate * 100) / 100,
      lateDeals,
      byStage,
      byType,
      exposureByType,
      topOperatorConcentration,
      statusMonitoringGaps,
      exposureByRiskTier,
      exposureByCity,
      stressTest,
    };
  }

  /**
   * Combine grille de risque et Knowledge Graph (spec ATLAS v2, A.8) —
   * borné aux opérateurs déjà sélectionnés dans le top 5, pas une
   * réécriture de l'algorithme de regroupement (qui reste par SIREN,
   * déjà correct). Pour chacun, si son entité PROMOTEUR a des relations
   * GROUPE_ECONOMIQUE (B.3), expose l'exposition supplémentaire des
   * dossiers liés aux entités sœurs — jamais fusionnée silencieusement
   * dans le total principal (doctrine section 0).
   */
  private async enrichConcentrationWithGroupEconomique(
    organizationId: string,
    operators: { porteurSiren: string | null; crd: number; dealCount: number; groupEconomiqueAdditionalExposure?: number }[],
  ): Promise<void> {
    for (const operator of operators) {
      if (!operator.porteurSiren) continue;

      const link = await this.prisma.dealEntityLink.findFirst({
        where: { role: 'PROMOTEUR', deal: { organizationId, porteurSiren: operator.porteurSiren } },
        select: { entityId: true },
      });
      if (!link) continue;

      const siblingRelationships = await this.prisma.relationship.findMany({
        where: { organizationId, typeKey: 'GROUPE_ECONOMIQUE', OR: [{ sourceEntityId: link.entityId }, { targetEntityId: link.entityId }] },
        select: { sourceEntityId: true, targetEntityId: true },
      });
      if (siblingRelationships.length === 0) continue;

      const siblingIds = siblingRelationships.map((r) => (r.sourceEntityId === link.entityId ? r.targetEntityId : r.sourceEntityId));
      const siblingDealLinks = await this.prisma.dealEntityLink.findMany({
        where: {
          role: 'PROMOTEUR',
          entityId: { in: siblingIds },
          // Prisma's `not` filter excludes NULL rows entirely (SQL 3-valued
          // logic: NULL != X is unknown, not true) — a sibling deal with no
          // porteurSiren at all would be silently dropped by a plain `not`
          // here, even though it was never counted under operator.crd (only
          // an exact SIREN match is grouped there). Explicit OR to include it.
          deal: {
            organizationId,
            status: 'ACTIVE',
            OR: [{ porteurSiren: null }, { porteurSiren: { not: operator.porteurSiren } }],
          },
        },
        select: { deal: { select: { id: true, amountRaised: true, repayments: { where: { projected: false }, select: { amount: true } } } } },
      });
      if (siblingDealLinks.length === 0) continue;

      operator.groupEconomiqueAdditionalExposure = siblingDealLinks.reduce((sum, l) => {
        const realized = l.deal.repayments.reduce((s, r) => s + Number(r.amount), 0);
        return sum + computeCrd(Number(l.deal.amountRaised), realized);
      }, 0);
    }
  }

  async newsletterSummary(organizationId: string) {
    const deals = await this.prisma.deal.findMany({
      where: { organizationId, status: 'ACTIVE', repaid: false, stage: { not: 'DEFAUT' } },
      select: { id: true, name: true, reference: true, lastNewsletterDate: true, newsletterTargetDays: true },
    });

    return deals
      .map((d) => ({ ...d, ...computeNewsletterStatus(d.lastNewsletterDate, d.newsletterTargetDays) }))
      .sort((a, b) => (b.daysSince ?? Infinity) - (a.daysSince ?? Infinity));
  }

  async pingNewsletter(organizationId: string, id: string, userId: string) {
    await this.assertExists(organizationId, id);
    const deal = await this.prisma.deal.update({ where: { id }, data: { lastNewsletterDate: new Date() } });
    await this.activities.log(id, userId, 'DEAL_UPDATED', 'Newsletter investisseurs envoyée');
    // Sending the NL resolves whatever reminder task the daily check may
    // have created — closing the loop instead of leaving a stale task.
    await this.prisma.task.updateMany({
      where: { dealId: id, title: NEWSLETTER_TASK_TITLE, done: false },
      data: { done: true, completedAt: new Date() },
    });
    return { ...deal, ...computeNewsletterStatus(deal.lastNewsletterDate, deal.newsletterTargetDays) };
  }

  /** Horodatage de la dernière vérification réussie d'une source externe (section 6 "Le Traçotin") — jamais un facteur de risque, seulement un indicateur de fraîcheur pour DataFreshnessResult. */
  async touchDataCheck(id: string, field: 'riskDataCheckedAt' | 'dpeCheckedAt') {
    await this.prisma.deal.update({ where: { id }, data: { [field]: new Date() } });
  }

  /**
   * Prorogation formelle de l'échéance du prêt (spec ATLAS v2, A.3bis) —
   * distincte du champ "Échéance de vote" (dateMax, process J-90/J-60/J-30/
   * J-15 propre à la campagne de collecte, voir ExtendDeadlineDialog) : ici
   * on prolonge Deal.endDate, l'échéance contractuelle réelle du prêt
   * affichée partout dans l'app. Crée un LoanExtension traçable avec sa
   * propre date de signature, et ne réécrit jamais dateEcheanceInitiale une
   * fois posée. Backfill : sur la toute première prorogation d'un dossier
   * créé avant ce lot, dateEcheanceInitiale n'existe pas encore — on la fixe
   * alors à la valeur d'endDate qu'on est en train de remplacer (dernière
   * valeur réellement connue, jamais une reconstruction inventée du passé).
   */
  async extendDeadline(organizationId: string, dealId: string, userId: string, dto: ExtendDeadlineDto) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, endDate: true, dateEcheanceInitiale: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const dateSignature = new Date(dto.dateSignature);
    const nouvelleDateEcheance = new Date(dto.nouvelleDateEcheance);
    const backfillInitiale = deal.dateEcheanceInitiale ?? deal.endDate ?? undefined;

    await this.prisma.$transaction([
      this.prisma.loanExtension.create({
        data: { dealId, dateSignature, nouvelleDateEcheance, createdById: userId },
      }),
      this.prisma.deal.update({
        where: { id: dealId },
        data: {
          endDate: nouvelleDateEcheance,
          dateEcheanceInitiale: deal.dateEcheanceInitiale ? undefined : backfillInitiale,
        },
      }),
    ]);

    await this.activities.log(
      dealId,
      userId,
      'DEAL_UPDATED',
      `Échéance du prêt prolongée : ${deal.endDate ? deal.endDate.toLocaleDateString('fr-FR') : '—'} → ${nouvelleDateEcheance.toLocaleDateString('fr-FR')} (signature le ${dateSignature.toLocaleDateString('fr-FR')})`,
    );
    await this.fieldChanges.recordDiff(organizationId, dealId, 'Deal', userId, [
      { key: 'endDate', label: 'Échéance', oldValue: deal.endDate, newValue: nouvelleDateEcheance },
    ]);

    return this.findOne(organizationId, dealId);
  }

  /**
   * Frise du cycle de vie du prêt (spec ATLAS v2, A.3bis) — calcul délégué à
   * loan-lifecycle.util.ts (pur, testable en isolation). L'échéance
   * d'origine retenue est dateEcheanceInitiale si une prorogation formelle a
   * déjà eu lieu, sinon la valeur courante d'endDate (dernière donnée réelle
   * connue) — évite d'exiger une action manuelle sur tout dossier existant
   * avant que cette frise n'existe pour l'afficher correctement dès le départ.
   */
  async getLoanLifecycle(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({
      where: { id: dealId, organizationId },
      select: { id: true, startDate: true, durationMonths: true, endDate: true, dateEcheanceInitiale: true, repaid: true, stage: true },
    });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const extensions = await this.prisma.loanExtension.findMany({
      where: { dealId },
      orderBy: { dateSignature: 'asc' },
      select: { dateSignature: true, nouvelleDateEcheance: true },
    });

    let terminal: LoanLifecycleTerminal | null = null;
    if (deal.stage === 'DEFAUT' || deal.repaid || deal.stage === 'REMBOURSE') {
      const targetStage = deal.stage === 'DEFAUT' ? 'DEFAUT' : 'REMBOURSE';
      const activity = await this.prisma.activity.findFirst({
        where: { dealId, type: 'STAGE_CHANGED', message: { contains: `→ ${targetStage}` } },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true },
      });
      // Pas de date de transition connue (ex. repaid activé sans changement
      // de stage tracé) → on ne fabrique pas de date de clôture, la frise
      // continue de vivre "aujourd'hui" plutôt que de mentir sur une date.
      if (activity) {
        terminal = { type: targetStage, date: activity.createdAt };
      }
    }
    if (!terminal) {
      const procedureCollective = await this.prisma.playbookInstance.findFirst({
        where: { dealId, eventType: 'PROCEDURE_COLLECTIVE_OUVERTE' },
        select: { triggeredAt: true },
      });
      if (procedureCollective) {
        terminal = { type: 'PROCEDURE_COLLECTIVE', date: procedureCollective.triggeredAt };
      }
    }

    return computeLoanLifecycle({
      startDate: deal.startDate,
      durationMonths: deal.durationMonths,
      dateEcheanceInitiale: deal.dateEcheanceInitiale ?? deal.endDate,
      extensions,
      terminal,
    });
  }

  private async assertExists(organizationId: string, id: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }

  /**
   * Turns the newsletter cadence from a passive status badge into an
   * actual assigned task once a deal is overdue against its own
   * newsletterTargetDays (45 by default), counted from lastNewsletterDate.
   * Runs once a day across every org — idempotent (skips a deal that
   * already has an open reminder) and self-clearing (pingNewsletter marks
   * the task done as soon as the NL is actually sent), so it never piles
   * up duplicate reminders while a project stays overdue.
   */
  @Cron(CronExpression.EVERY_DAY_AT_7AM)
  async createOverdueNewsletterTasks() {
    const deals = await this.prisma.deal.findMany({
      where: { status: 'ACTIVE', repaid: false, stage: { not: 'DEFAUT' } },
      select: {
        id: true,
        organizationId: true,
        name: true,
        lastNewsletterDate: true,
        newsletterTargetDays: true,
        assignedToId: true,
        createdById: true,
      },
    });

    let created = 0;
    for (const deal of deals) {
      const { daysSince } = computeNewsletterStatus(deal.lastNewsletterDate, deal.newsletterTargetDays);
      if (daysSince === null || daysSince < deal.newsletterTargetDays) continue;

      const existing = await this.prisma.task.findFirst({
        where: { dealId: deal.id, title: NEWSLETTER_TASK_TITLE, done: false, cancelledAt: null },
        select: { id: true },
      });
      if (existing) continue;

      const assigneeId = deal.assignedToId ?? deal.createdById;
      await this.tasks.create(deal.organizationId, assigneeId, {
        title: NEWSLETTER_TASK_TITLE,
        dealId: deal.id,
        priority: 'HIGH',
        dueDate: new Date().toISOString().slice(0, 10),
        assigneeId,
      });
      created += 1;
    }

    if (created > 0) this.logger.log(`Newsletter : ${created} tâche(s) de relance créée(s) pour des dossiers en retard.`);
  }
}
