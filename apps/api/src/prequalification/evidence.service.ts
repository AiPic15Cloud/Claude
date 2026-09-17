import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { UpsertEvidenceDto } from './dto/upsert-evidence.dto';

@Injectable()
export class EvidenceService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, caseId: string) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalEvidence.findMany({ where: { prequalificationCaseId: caseId } });
  }

  /** Un seul enregistrement de provenance par (entité, champ) — upsert sur la contrainte unique du schéma. */
  async upsert(organizationId: string, caseId: string, entityType: string, entityId: string, fieldKey: string, userId: string, dto: UpsertEvidenceDto) {
    await this.getOwnedCase(organizationId, caseId);
    const isVerification = dto.status === 'VERIFIED_DOCUMENT' || dto.status === 'VERIFIED_OFFICIAL';
    const data = {
      status: dto.status,
      sourceDocumentId: dto.sourceDocumentId,
      sourcePage: dto.sourcePage,
      sourceUrl: dto.sourceUrl,
      confidence: dto.confidence,
      note: dto.note,
      ...(isVerification ? { verifiedById: userId, verifiedAt: new Date() } : {}),
    };
    return this.prisma.prequalEvidence.upsert({
      where: { prequalificationCaseId_entityType_entityId_fieldKey: { prequalificationCaseId: caseId, entityType, entityId, fieldKey } },
      create: { prequalificationCaseId: caseId, entityType, entityId, fieldKey, ...data },
      update: data,
    });
  }

  private async getOwnedCase(organizationId: string, caseId: string) {
    const found = await this.prisma.prequalificationCase.findFirst({ where: { id: caseId, organizationId } });
    if (!found) throw new NotFoundException('Dossier de préqualification introuvable.');
    return found;
  }
}
