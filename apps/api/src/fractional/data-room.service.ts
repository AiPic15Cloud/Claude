import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertDataRoomItemStatusDto } from './dto/upsert-data-room-item-status.dto';
import { computeDataRoomCompleteness, DATA_ROOM_BLOCKS, type DataRoomBlockKey } from './data-room-completeness.util';

/**
 * Data Room Completeness Engine (spec V3.1 §4) — service applicatif au-dessus
 * du registre fermé DATA_ROOM_BLOCKS. Mêmes garde-fous que DataProvenanceService :
 * contrôle d'accès organisation systématique, block/itemKey validés contre le
 * registre fermé (jamais un champ libre non résolvable).
 */
@Injectable()
export class DataRoomService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
    if (!project) throw new NotFoundException('Dossier non trouvé');
    return project;
  }

  private assertKnownItem(block: string, itemKey: string) {
    const blockDef = DATA_ROOM_BLOCKS[block as DataRoomBlockKey];
    if (!blockDef) throw new NotFoundException(`Bloc de data room inconnu : ${block}`);
    if (!blockDef.items.some((item) => item.itemKey === itemKey)) {
      throw new NotFoundException(`Pièce inconnue "${itemKey}" pour le bloc ${block}`);
    }
  }

  async getCompleteness(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    const statuses = await this.prisma.fractionalDataRoomItemStatus.findMany({ where: { projectId } });
    return computeDataRoomCompleteness(statuses);
  }

  async upsertItemStatus(projectId: string, block: string, itemKey: string, dto: UpsertDataRoomItemStatusDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    this.assertKnownItem(block, itemKey);

    return this.prisma.fractionalDataRoomItemStatus.upsert({
      where: { projectId_block_itemKey: { projectId, block, itemKey } },
      create: { projectId, block, itemKey, status: dto.status, notes: dto.notes ?? null, updatedById: user.id },
      update: { status: dto.status, notes: dto.notes ?? null, updatedById: user.id },
    });
  }
}
