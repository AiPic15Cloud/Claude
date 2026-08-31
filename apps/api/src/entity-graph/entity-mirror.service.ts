import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Chaque Deal a une Entity miroir (type OPERATION) dans le Knowledge Graph
 * v2 — sans elle, une Relationship ne peut pas pointer nativement vers une
 * opération (ex. "caution partagée entre Opération X et Opération Y", B.3).
 * Id dérivé `deal_<dealId>` : pas de table de mapping séparée à maintenir.
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
}
