import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import type { ActionItemStatus, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { isDetteRestricted } from '../common/guards/dette-scope.guard';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { ResolveActionItemDto } from './dto/resolve-action-item.dto';
import { ReassignActionItemDto } from './dto/reassign-action-item.dto';
import { DeferActionItemDto } from './dto/defer-action-item.dto';

const OPEN_STATUSES: ActionItemStatus[] = ['A_FAIRE', 'EN_ATTENTE_EXTERNE', 'A_DECIDER'];

export interface EnsureOpenActionItemInput {
  organizationId: string;
  dealId?: string;
  fractionalProjectId?: string;
  cause: string;
  actionType: string;
  label: string;
  ownerId: string;
  dueAt?: Date | null;
  blocking?: boolean;
  deepLink: string;
}

/**
 * File de décisions et d'actions générique (spec Cockpit/Fractionné P1
 * §4.2/§6). `ensureOpen`/`resolveByCause` sont les points d'entrée destinés
 * aux moteurs (Fractionné, Deal) qui génèrent des actions automatiquement :
 * ils appliquent la doctrine "la même cause ne génère qu'une action ouverte
 * par dossier" et "un changement de donnée résout ou réévalue
 * automatiquement l'action" sans que l'appelant ait à connaître l'état
 * actuel de la file.
 */
@Injectable()
export class ActionItemsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Lot B (espaces étanches) : un compte FRACTIONAL_ONLY ne doit jamais voir une action liée à un Deal, même via la file générique. */
  private scopeWhere(user: AuthenticatedUser): Prisma.ActionItemWhereInput {
    return { organizationId: user.organizationId, ...(isDetteRestricted(user.workspaceScope) ? { dealId: null } : {}) };
  }

  async list(
    user: AuthenticatedUser,
    filters: { status?: ActionItemStatus; ownerId?: string; openOnly?: boolean } = {},
  ) {
    return this.prisma.actionItem.findMany({
      where: {
        ...this.scopeWhere(user),
        ...(filters.status ? { status: filters.status } : filters.openOnly ? { status: { in: OPEN_STATUSES } } : {}),
        ...(filters.ownerId ? { ownerId: filters.ownerId } : {}),
      },
      orderBy: [{ blocking: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  /** Liste ouverte brute pour la fusion côté Cockpit — tri par blocage puis échéance (spec §4.2). */
  async findOpenForOrganization(organizationId: string, restricted = false) {
    return this.prisma.actionItem.findMany({
      where: { organizationId, status: { in: OPEN_STATUSES }, ...(restricted ? { dealId: null } : {}) },
      include: {
        owner: { select: { firstName: true, lastName: true } },
        deal: { select: { id: true, name: true, reference: true } },
        fractionalProject: { select: { id: true, name: true, reference: true } },
      },
      orderBy: [{ blocking: 'desc' }, { dueAt: 'asc' }, { createdAt: 'asc' }],
    });
  }

  async create(dto: CreateActionItemDto, user: AuthenticatedUser) {
    if (!dto.dealId && !dto.fractionalProjectId) {
      throw new ForbiddenException('Une action doit être rattachée à un dossier (dealId ou fractionalProjectId).');
    }
    return this.ensureOpen({
      organizationId: user.organizationId,
      dealId: dto.dealId,
      fractionalProjectId: dto.fractionalProjectId,
      cause: dto.cause,
      actionType: dto.actionType,
      label: dto.label,
      ownerId: dto.ownerId,
      dueAt: dto.dueAt ? new Date(dto.dueAt) : null,
      blocking: dto.blocking ?? false,
      deepLink: dto.deepLink,
    });
  }

  /**
   * Trouve l'action ouverte pour (dossier, cause), la met à jour si les
   * champs affichés ont changé, ou la rouvre si elle avait été résolue
   * (spec §4.2 : "une modification ultérieure peut la rouvrir avec
   * historique"), ou en crée une nouvelle sinon. Jamais deux actions
   * ouvertes pour la même cause sur le même dossier.
   */
  async ensureOpen(input: EnsureOpenActionItemInput) {
    const existing = await this.prisma.actionItem.findFirst({
      where: {
        organizationId: input.organizationId,
        dealId: input.dealId ?? null,
        fractionalProjectId: input.fractionalProjectId ?? null,
        cause: input.cause,
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!existing) {
      return this.prisma.actionItem.create({
        data: {
          organizationId: input.organizationId,
          dealId: input.dealId,
          fractionalProjectId: input.fractionalProjectId,
          cause: input.cause,
          actionType: input.actionType,
          label: input.label,
          ownerId: input.ownerId,
          dueAt: input.dueAt ?? null,
          blocking: input.blocking ?? false,
          deepLink: input.deepLink,
        },
      });
    }

    const isOpen = OPEN_STATUSES.includes(existing.status);
    if (isOpen) {
      // Déjà ouverte pour cette cause — met à jour le contenu affiché sans
      // toucher au propriétaire ni à l'échéance déjà choisis manuellement.
      if (existing.label === input.label && existing.blocking === (input.blocking ?? false)) {
        return existing;
      }
      return this.prisma.actionItem.update({
        where: { id: existing.id },
        data: { label: input.label, blocking: input.blocking ?? existing.blocking },
      });
    }

    // Résolue précédemment, la cause redevient d'actualité : réouverture
    // avec historique (spec §4.2), jamais une nouvelle ligne muette.
    const history = Array.isArray(existing.history) ? existing.history : [];
    return this.prisma.actionItem.update({
      where: { id: existing.id },
      data: {
        status: 'A_FAIRE',
        label: input.label,
        blocking: input.blocking ?? false,
        dueAt: input.dueAt ?? null,
        resolvedAt: null,
        resolutionReason: null,
        history: [...history, { status: existing.status, at: existing.resolvedAt ?? existing.updatedAt, reason: existing.resolutionReason, reopenedAt: new Date().toISOString() }] as Prisma.InputJsonValue,
      },
    });
  }

  /** Résout automatiquement une action par sa cause quand la donnée qui l'a déclenchée change (spec §4.2). */
  async resolveByCause(
    scope: { organizationId: string; dealId?: string; fractionalProjectId?: string },
    cause: string,
    resolutionReason: string,
  ) {
    const existing = await this.prisma.actionItem.findFirst({
      where: {
        organizationId: scope.organizationId,
        dealId: scope.dealId ?? null,
        fractionalProjectId: scope.fractionalProjectId ?? null,
        cause,
        status: { in: OPEN_STATUSES },
      },
    });
    if (!existing) return null;
    return this.prisma.actionItem.update({
      where: { id: existing.id },
      data: { status: 'TERMINEE', resolvedAt: new Date(), resolutionReason },
    });
  }

  async resolve(id: string, dto: ResolveActionItemDto, user: AuthenticatedUser) {
    const item = await this.findOneScoped(id, user);
    return this.prisma.actionItem.update({
      where: { id: item.id },
      data: { status: dto.status, resolvedAt: new Date(), resolutionReason: dto.resolutionReason },
    });
  }

  async reassign(id: string, dto: ReassignActionItemDto, user: AuthenticatedUser) {
    const item = await this.findOneScoped(id, user);
    return this.prisma.actionItem.update({ where: { id: item.id }, data: { ownerId: dto.ownerId } });
  }

  async defer(id: string, dto: DeferActionItemDto, user: AuthenticatedUser) {
    const item = await this.findOneScoped(id, user);
    return this.prisma.actionItem.update({ where: { id: item.id }, data: { dueAt: new Date(dto.dueAt) } });
  }

  private async findOneScoped(id: string, user: AuthenticatedUser) {
    const item = await this.prisma.actionItem.findUnique({ where: { id } });
    if (!item || item.organizationId !== user.organizationId) {
      throw new NotFoundException('Action introuvable.');
    }
    return item;
  }
}
