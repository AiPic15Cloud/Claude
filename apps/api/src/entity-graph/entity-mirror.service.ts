import { Injectable } from '@nestjs/common';
import type { GraphEntityType, EntityType } from '@prisma/client';
import { PrismaService } from '../common/prisma/prisma.service';

/** GraphEntityType (ancien modèle) est un sous-ensemble strict d'EntityType (v2) — mapping explicite plutôt qu'un cast, pour que l'ajout d'une valeur à l'un des deux enums casse la build au lieu de silencieusement mal aligner l'autre. */
const GRAPH_ENTITY_TYPE_TO_ENTITY_TYPE: Record<GraphEntityType, EntityType> = {
  PROMOTEUR: 'PROMOTEUR',
  BANQUE: 'BANQUE',
  NOTAIRE: 'NOTAIRE',
  ARCHITECTE: 'ARCHITECTE',
  COLLECTIVITE: 'COLLECTIVITE',
  INVESTISSEUR: 'INVESTISSEUR',
  PLATEFORME: 'PLATEFORME',
};

/**
 * Miroirs Entity (Knowledge Graph v2) — deux familles distinctes, même
 * mécanisme :
 * - Deal → Entity (type OPERATION, id `deal_<dealId>`) : permet à une
 *   Relationship de pointer nativement vers une opération (B.3).
 * - GraphEntity → Entity (id réutilisé tel quel) : sans ce miroir, toute
 *   contrepartie créée/modifiée via l'écran Knowledge Graph actuel
 *   (ancien modèle GraphEntity) serait invisible pour les requêtes
 *   déterministes de B.3, qui ne lisent que le modèle v2.
 */
@Injectable()
export class EntityMirrorService {
  constructor(private readonly prisma: PrismaService) {}

  private mirrorId(dealId: string): string {
    return `deal_${dealId}`;
  }

  async createMirror(organizationId: string, dealId: string, name: string, reference: string): Promise<void> {
    await this.prisma.entity.create({
      data: {
        id: this.mirrorId(dealId),
        organizationId,
        type: 'OPERATION',
        domain: 'PORTFOLIO',
        name,
        description: reference,
        // Coverage VERIFIED : c'est l'opération elle-même, donnée de
        // première main, pas une observation tierce à vérifier.
        coverage: 'VERIFIED',
        mirrorsDealId: dealId,
      },
    });
  }

  /** No-op si le nom/référence n'ont pas changé, ou si le miroir n'existe pas encore (dossiers pré-migration jamais recréés). */
  async syncMirror(dealId: string, name: string, reference: string): Promise<void> {
    await this.prisma.entity.updateMany({
      where: { mirrorsDealId: dealId },
      data: { name, description: reference },
    });
  }

  /** Coverage UNKNOWN volontaire : une entité juste déclarée via le formulaire n'a encore aucune preuve attachée (section 0.2) — jamais VERIFIED par défaut. */
  async createGraphEntityMirror(organizationId: string, graphEntity: { id: string; type: GraphEntityType; name: string }): Promise<void> {
    await this.prisma.entity.create({
      data: {
        id: graphEntity.id,
        organizationId,
        type: GRAPH_ENTITY_TYPE_TO_ENTITY_TYPE[graphEntity.type],
        domain: 'PORTFOLIO',
        name: graphEntity.name,
        coverage: 'UNKNOWN',
      },
    });
  }

  /** Ne resynchronise que le nom — coverage/domaine v2 évoluent avec les preuves attachées côté v2, pas depuis l'ancien modèle. */
  async syncGraphEntityMirror(id: string, name: string): Promise<void> {
    await this.prisma.entity.updateMany({ where: { id }, data: { name } });
  }

  async deleteGraphEntityMirror(id: string): Promise<void> {
    await this.prisma.entity.deleteMany({ where: { id } });
  }
}
