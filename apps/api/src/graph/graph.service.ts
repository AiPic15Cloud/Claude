import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { GraphEntityType, Prisma } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';
import { MeilisearchService } from '../search/meilisearch.service';
import { EntityMirrorService } from '../entity-graph/entity-mirror.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateRelationDto } from './dto/create-relation.dto';
import { QueryEntitiesDto } from './dto/query-entities.dto';

export interface GraphNode {
  id: string;
  kind: 'entity' | 'deal';
  type: string;
  label: string;
  subtitle?: string | null;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  label?: string | null;
}

@Injectable()
export class GraphService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly search: MeilisearchService,
    private readonly entityMirror: EntityMirrorService,
  ) {}

  listEntities(organizationId: string, query: QueryEntitiesDto) {
    const where: Prisma.GraphEntityWhereInput = {
      organizationId,
      ...(query.type ? { type: query.type } : {}),
      ...(query.search
        ? { name: { contains: query.search, mode: 'insensitive' as Prisma.QueryMode } }
        : {}),
    };
    return this.prisma.graphEntity.findMany({
      where,
      orderBy: { name: 'asc' },
      include: { _count: { select: { dealLinks: true, relationsFrom: true, relationsTo: true } } },
    });
  }

  async getEntity(organizationId: string, id: string) {
    const entity = await this.prisma.graphEntity.findFirst({
      where: { id, organizationId },
      include: {
        dealLinks: { include: { deal: { select: { id: true, name: true, reference: true, stage: true } } } },
        relationsFrom: { include: { toEntity: true } },
        relationsTo: { include: { fromEntity: true } },
        articles: { include: { article: true }, orderBy: { article: { publishedAt: 'desc' } }, take: 10 },
      },
    });
    if (!entity) throw new NotFoundException('Entité introuvable');
    return entity;
  }

  async createEntity(organizationId: string, dto: CreateEntityDto) {
    const entity = await this.prisma.graphEntity.create({
      data: { organizationId, ...dto, metadata: dto.metadata as Prisma.InputJsonValue },
    });
    void this.search.indexEntity({
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      type: entity.type,
      city: entity.city,
    });
    // Miroir Knowledge Graph v2 (B.3) — sans lui cette contrepartie serait
    // invisible pour les requêtes déterministes, qui ne lisent que le
    // nouveau modèle.
    await this.entityMirror.createGraphEntityMirror(organizationId, entity);
    return entity;
  }

  async updateEntity(organizationId: string, id: string, dto: UpdateEntityDto) {
    await this.assertEntity(organizationId, id);
    const entity = await this.prisma.graphEntity.update({
      where: { id },
      data: { ...dto, metadata: dto.metadata as Prisma.InputJsonValue },
    });
    void this.search.indexEntity({
      id: entity.id,
      organizationId: entity.organizationId,
      name: entity.name,
      type: entity.type,
      city: entity.city,
    });
    await this.entityMirror.syncGraphEntityMirror(entity.id, entity.name);
    return entity;
  }

  async removeEntity(organizationId: string, id: string) {
    await this.assertEntity(organizationId, id);
    await this.prisma.graphEntity.delete({ where: { id } });
    void this.search.removeEntity(id);
    await this.entityMirror.deleteGraphEntityMirror(id);
  }

  async createRelation(organizationId: string, dto: CreateRelationDto) {
    await this.assertEntity(organizationId, dto.fromEntityId);
    await this.assertEntity(organizationId, dto.toEntityId);
    if (dto.fromEntityId === dto.toEntityId) {
      throw new ConflictException('Une entité ne peut pas être reliée à elle-même');
    }
    return this.prisma.graphRelation.create({ data: { organizationId, ...dto } });
  }

  async removeRelation(organizationId: string, id: string) {
    const relation = await this.prisma.graphRelation.findFirst({ where: { id, organizationId } });
    if (!relation) throw new NotFoundException('Relation introuvable');
    await this.prisma.graphRelation.delete({ where: { id } });
  }

  async linkDeal(organizationId: string, dealId: string, entityId: string, role: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    await this.assertEntity(organizationId, entityId);

    return this.prisma.dealEntityLink.upsert({
      where: { dealId_entityId_role: { dealId, entityId, role: role as never } },
      create: { dealId, entityId, role: role as never },
      update: {},
      include: { entity: true },
    });
  }

  /**
   * Rapproche automatiquement Deal.porteurSiren (texte libre) d'une entité
   * PROMOTEUR du Knowledge Graph portant le même SIREN — les deux
   * représentations du porteur étaient jusqu'ici totalement déconnectées.
   * Best-effort et jamais ambigu : ne remplace jamais un lien PROMOTEUR déjà
   * posé, et ne fabrique jamais de GraphEntity — si aucune entité n'a ce
   * SIREN, rien ne se passe.
   */
  async autoLinkPromoteurBySiren(organizationId: string, dealId: string, siren: string | null | undefined): Promise<boolean> {
    if (!siren) return false;
    const existing = await this.prisma.dealEntityLink.findFirst({ where: { dealId, role: 'PROMOTEUR' as never } });
    if (existing) return false;
    const entity = await this.prisma.graphEntity.findFirst({ where: { organizationId, type: 'PROMOTEUR', siren } });
    if (!entity) return false;
    await this.linkDeal(organizationId, dealId, entity.id, 'PROMOTEUR');
    return true;
  }

  async unlinkDeal(organizationId: string, dealId: string, linkId: string) {
    const link = await this.prisma.dealEntityLink.findFirst({
      where: { id: linkId, dealId, deal: { organizationId } },
    });
    if (!link) throw new NotFoundException('Lien introuvable');
    await this.prisma.dealEntityLink.delete({ where: { id: linkId } });
  }

  listDealLinks(organizationId: string, dealId: string) {
    return this.prisma.dealEntityLink.findMany({
      where: { dealId, deal: { organizationId } },
      include: { entity: true },
    });
  }

  /** Full graph payload for the React Flow visualization, optionally filtered by entity type. */
  async getGraph(organizationId: string, types?: GraphEntityType[]): Promise<{ nodes: GraphNode[]; edges: GraphEdge[] }> {
    const entities = await this.prisma.graphEntity.findMany({
      where: { organizationId, ...(types?.length ? { type: { in: types } } : {}) },
    });
    const entityIds = new Set(entities.map((e) => e.id));

    const relations = await this.prisma.graphRelation.findMany({
      where: { organizationId, fromEntityId: { in: [...entityIds] }, toEntityId: { in: [...entityIds] } },
    });

    const dealLinks = await this.prisma.dealEntityLink.findMany({
      where: { entityId: { in: [...entityIds] }, deal: { organizationId } },
      include: { deal: { select: { id: true, name: true, reference: true, stage: true } } },
    });

    const dealNodesMap = new Map<string, GraphNode>();
    for (const link of dealLinks) {
      dealNodesMap.set(link.deal.id, {
        id: `deal:${link.deal.id}`,
        kind: 'deal',
        type: 'DEAL',
        label: link.deal.name,
        subtitle: link.deal.reference,
      });
    }

    const nodes: GraphNode[] = [
      ...entities.map((e) => ({
        id: `entity:${e.id}`,
        kind: 'entity' as const,
        type: e.type,
        label: e.name,
        subtitle: e.city ?? undefined,
      })),
      ...dealNodesMap.values(),
    ];

    const edges: GraphEdge[] = [
      ...relations.map((r) => ({
        id: `relation:${r.id}`,
        source: `entity:${r.fromEntityId}`,
        target: `entity:${r.toEntityId}`,
        type: r.type,
        label: r.label,
      })),
      ...dealLinks.map((l) => ({
        id: `link:${l.id}`,
        source: `entity:${l.entityId}`,
        target: `deal:${l.deal.id}`,
        type: l.role,
        label: l.role,
      })),
    ];

    return { nodes, edges };
  }

  private async assertEntity(organizationId: string, id: string) {
    const entity = await this.prisma.graphEntity.findFirst({ where: { id, organizationId } });
    if (!entity) throw new NotFoundException('Entité introuvable');
    return entity;
  }
}
