import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UpsertLegalTaxItemStatusDto } from './dto/upsert-legal-tax-item-status.dto';
import { computeLegalTaxDdSummary, LEGAL_TAX_BLOCKS, type LegalTaxBlockKey } from './legal-tax-dd.util';

/**
 * Legal, Planning & Tax DD Engine (spec V3.1 §13) — service applicatif
 * au-dessus de legal-tax-dd.util.ts, mirroté sur DataRoomService (contrôle
 * d'accès organisation, block/itemKey validés contre le registre fermé).
 */
@Injectable()
export class LegalTaxDdService {
  constructor(private readonly prisma: PrismaService) {}

  private async assertProjectAccess(projectId: string, user: AuthenticatedUser) {
    const project = await this.prisma.fractionalProject.findFirst({ where: { id: projectId, organizationId: user.organizationId } });
    if (!project) throw new NotFoundException('Dossier non trouvé');
    return project;
  }

  private assertKnownItem(block: string, itemKey: string) {
    const blockDef = LEGAL_TAX_BLOCKS[block as LegalTaxBlockKey];
    if (!blockDef) throw new NotFoundException(`Bloc juridique/fiscal inconnu : ${block}`);
    if (!blockDef.items.some((item) => item.itemKey === itemKey)) {
      throw new NotFoundException(`Item inconnu "${itemKey}" pour le bloc ${block}`);
    }
  }

  async getSummary(projectId: string, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    const statuses = await this.prisma.fractionalLegalTaxItemStatus.findMany({ where: { projectId } });
    return computeLegalTaxDdSummary(statuses);
  }

  async upsertItemStatus(projectId: string, block: string, itemKey: string, dto: UpsertLegalTaxItemStatusDto, user: AuthenticatedUser) {
    await this.assertProjectAccess(projectId, user);
    this.assertKnownItem(block, itemKey);

    return this.prisma.fractionalLegalTaxItemStatus.upsert({
      where: { projectId_block_itemKey: { projectId, block, itemKey } },
      create: { projectId, block, itemKey, status: dto.status, notes: dto.notes ?? null, updatedById: user.id },
      update: { status: dto.status, notes: dto.notes ?? null, updatedById: user.id },
    });
  }
}
