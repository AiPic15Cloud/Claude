import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateDealDocumentRequestDto, UpdateDealDocumentRequestDto } from './dto/create-deal-document-request.dto';

@Injectable()
export class DealDocumentRequestsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, dealId: string) {
    await this.assertDeal(organizationId, dealId);
    return this.prisma.dealDocumentRequest.findMany({
      where: { dealId },
      include: { linkedDocument: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async create(organizationId: string, dealId: string, userId: string, dto: CreateDealDocumentRequestDto) {
    await this.assertDeal(organizationId, dealId);
    return this.prisma.dealDocumentRequest.create({
      data: { dealId, requestedById: userId, label: dto.label, block: dto.block },
      include: { linkedDocument: { select: { id: true, name: true } } },
    });
  }

  async update(organizationId: string, dealId: string, requestId: string, dto: UpdateDealDocumentRequestDto) {
    await this.assertDeal(organizationId, dealId);
    const existing = await this.prisma.dealDocumentRequest.findFirst({ where: { id: requestId, dealId } });
    if (!existing) throw new NotFoundException('Demande de pièce introuvable');

    // Un lien vers un document doit rester dans le même dossier — sinon une
    // demande pourrait pointer vers une pièce d'un autre Deal par erreur de
    // saisie d'id.
    if (dto.linkedDocumentId) {
      const doc = await this.prisma.document.findFirst({ where: { id: dto.linkedDocumentId, dealId } });
      if (!doc) throw new NotFoundException('Document introuvable dans ce dossier');
    }

    return this.prisma.dealDocumentRequest.update({
      where: { id: requestId },
      data: { status: dto.status, linkedDocumentId: dto.linkedDocumentId },
      include: { linkedDocument: { select: { id: true, name: true } } },
    });
  }

  private async assertDeal(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return deal;
  }
}
