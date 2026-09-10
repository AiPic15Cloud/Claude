import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

const GROUP_RELATIONSHIP_TYPE = 'GROUPE_ECONOMIQUE';

/**
 * Reconstruit le périmètre économique d'une entité (spec Market
 * Relationship & Contagion Intelligence V2, §7.2/§16 "Group Builder") —
 * traversée transitive des relations GROUPE_ECONOMIQUE, alors que
 * EntityIntelligenceService.getSummary() (B.3) ne faisait jusqu'ici qu'un
 * seul saut (doctrine explicite : "multi-niveaux réservé à B.4/B.5", voir
 * son commentaire de classe — c'est précisément ce que ce service ajoute).
 *
 * `getGroupEntityIds` est une lecture live (BFS à chaque appel, jamais
 * périmée) ; `materializeGroup` persiste le résultat dans EconomicGroup pour
 * l'affichage et l'historique, mais n'est jamais la source de vérité pour un
 * calcul — toujours retraverser les Relationship pour ça.
 */
@Injectable()
export class GroupBuilderService {
  constructor(private readonly prisma: PrismaService) {}

  /** Clôture transitive (BFS) des entités reliées par GROUPE_ECONOMIQUE — n'inclut jamais l'entité de départ elle-même. */
  async getGroupEntityIds(organizationId: string, entityId: string): Promise<Set<string>> {
    const visited = new Set<string>([entityId]);
    let frontier = [entityId];

    while (frontier.length > 0) {
      const relationships = await this.prisma.relationship.findMany({
        where: {
          organizationId,
          typeKey: GROUP_RELATIONSHIP_TYPE,
          status: 'ACTIVE',
          OR: [{ sourceEntityId: { in: frontier } }, { targetEntityId: { in: frontier } }],
        },
        select: { sourceEntityId: true, targetEntityId: true },
      });

      const next: string[] = [];
      for (const r of relationships) {
        for (const id of [r.sourceEntityId, r.targetEntityId]) {
          if (!visited.has(id)) {
            visited.add(id);
            next.push(id);
          }
        }
      }
      frontier = next;
    }

    visited.delete(entityId);
    return visited;
  }

  /**
   * Persiste la clôture courante comme EconomicGroup — appelé après la
   * création/modification d'une relation GROUPE_ECONOMIQUE (voir
   * RelationshipsService). Fusionne deux groupes existants si une nouvelle
   * relation les relie transitivement (le plus ancien des deux devient
   * canonique — heuristique sur l'ordre des cuid, pas un choix métier).
   * Retourne null si l'entité n'appartient à aucun groupe (aucune relation
   * GROUPE_ECONOMIQUE active) — ne crée jamais un groupe à un seul membre.
   */
  async materializeGroup(organizationId: string, entityId: string) {
    const siblingIds = await this.getGroupEntityIds(organizationId, entityId);
    if (siblingIds.size === 0) return null;

    const allIds = [entityId, ...siblingIds];

    const existingMemberships = await this.prisma.economicGroupMember.findMany({
      where: { entityId: { in: allIds }, leftAt: null, group: { organizationId } },
      select: { groupId: true },
    });
    const groupIds = [...new Set(existingMemberships.map((m) => m.groupId))].sort();

    let canonicalGroupId: string;
    if (groupIds.length === 0) {
      const entity = await this.prisma.entity.findFirstOrThrow({ where: { id: entityId, organizationId } });
      const group = await this.prisma.economicGroup.create({ data: { organizationId, name: `Groupe ${entity.name}` } });
      canonicalGroupId = group.id;
    } else {
      [canonicalGroupId] = groupIds;
      const staleGroupIds = groupIds.slice(1);
      if (staleGroupIds.length > 0) {
        await this.prisma.economicGroupMember.updateMany({
          where: { groupId: { in: staleGroupIds }, leftAt: null },
          data: { leftAt: new Date() },
        });
      }
    }

    for (const id of allIds) {
      await this.prisma.economicGroupMember.upsert({
        where: { groupId_entityId: { groupId: canonicalGroupId, entityId: id } },
        update: { leftAt: null },
        create: { groupId: canonicalGroupId, entityId: id },
      });
    }

    return this.prisma.economicGroup.findUniqueOrThrow({
      where: { id: canonicalGroupId },
      include: {
        members: { where: { leftAt: null }, include: { entity: { select: { id: true, name: true, type: true } } } },
      },
    });
  }
}
