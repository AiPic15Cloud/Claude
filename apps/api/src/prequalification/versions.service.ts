import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { diffPrequalVersions, type PrequalSnapshotLike } from './prequal-version-diff.util';

@Injectable()
export class VersionsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizationId: string, caseId: string) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalificationVersion.findMany({
      where: { prequalificationCaseId: caseId },
      select: {
        id: true,
        versionNumber: true,
        orientation: true,
        decisionComment: true,
        validatedAt: true,
        validatedBy: { select: { id: true, firstName: true, lastName: true } },
      },
      orderBy: { versionNumber: 'desc' },
    });
  }

  async compare(organizationId: string, caseId: string, versionA: number, versionB: number) {
    await this.getOwnedCase(organizationId, caseId);
    const [a, b] = await Promise.all([
      this.prisma.prequalificationVersion.findUnique({ where: { prequalificationCaseId_versionNumber: { prequalificationCaseId: caseId, versionNumber: versionA } } }),
      this.prisma.prequalificationVersion.findUnique({ where: { prequalificationCaseId_versionNumber: { prequalificationCaseId: caseId, versionNumber: versionB } } }),
    ]);
    if (!a || !b) throw new BadRequestException('Une des deux versions demandées est introuvable pour ce dossier.');

    return diffPrequalVersions(versionA, a.snapshot as unknown as PrequalSnapshotLike, versionB, b.snapshot as unknown as PrequalSnapshotLike);
  }

  private async getOwnedCase(organizationId: string, caseId: string) {
    const found = await this.prisma.prequalificationCase.findFirst({ where: { id: caseId, organizationId } });
    if (!found) throw new NotFoundException('Dossier de préqualification introuvable.');
    return found;
  }
}
