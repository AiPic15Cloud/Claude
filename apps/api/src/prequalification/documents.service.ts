import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { StorageService } from '../common/storage/storage.service';
import { assertFileContentMatchesMime } from '../common/storage/file-validation.util';
import { UpdateDocumentDto } from './dto/update-document.dto';

const DOCUMENT_INCLUDE = {
  uploadedBy: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
} as const;

@Injectable()
export class PrequalDocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
  ) {}

  async upload(organizationId: string, caseId: string, userId: string, file: Express.Multer.File) {
    const prequalCase = await this.prisma.prequalificationCase.findFirst({ where: { id: caseId, organizationId } });
    if (!prequalCase) throw new NotFoundException('Dossier de préqualification introuvable.');

    assertFileContentMatchesMime(file.buffer, file.mimetype);
    const stored = await this.storage.save(caseId, file.originalname, file.buffer, file.mimetype);

    return this.prisma.prequalDocument.create({
      data: {
        prequalificationCaseId: caseId,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: stored.storageKey,
        storageDriver: stored.driver,
        uploadedById: userId,
      },
      include: DOCUMENT_INCLUDE,
    });
  }

  async list(organizationId: string, caseId: string) {
    await this.getOwnedCase(organizationId, caseId);
    return this.prisma.prequalDocument.findMany({ where: { prequalificationCaseId: caseId }, include: DOCUMENT_INCLUDE, orderBy: { createdAt: 'desc' } });
  }

  async update(organizationId: string, caseId: string, documentId: string, dto: UpdateDocumentDto) {
    await this.getOwnedDocument(organizationId, caseId, documentId);
    return this.prisma.prequalDocument.update({ where: { id: documentId }, data: dto });
  }

  async getDownloadUrl(organizationId: string, caseId: string, documentId: string) {
    const document = await this.getOwnedDocument(organizationId, caseId, documentId);
    const url = await this.storage.getUrl(document.storageKey, document.storageDriver);
    return { url };
  }

  /** Bytes bruts pour l'extraction assistée par IA — jamais un lien client. */
  async getBuffer(organizationId: string, caseId: string, documentId: string) {
    const document = await this.getOwnedDocument(organizationId, caseId, documentId);
    const buffer = await this.storage.read(document.storageKey, document.storageDriver);
    return { buffer, mimeType: document.mimeType, name: document.name };
  }

  /** Même garde-fou anti-fuite cross-organisation que readLocalFile de DocumentsService — vérifie l'appartenance avant de lire le blob. */
  async readLocalFile(organizationId: string, storageKey: string) {
    const owned = await this.prisma.prequalDocument.findFirst({
      where: { storageKey, case: { organizationId } },
      select: { id: true },
    });
    if (!owned) throw new NotFoundException('Fichier introuvable');
    return this.storage.readLocal(storageKey);
  }

  async remove(organizationId: string, caseId: string, documentId: string) {
    const document = await this.getOwnedDocument(organizationId, caseId, documentId);
    await this.storage.delete(document.storageKey, document.storageDriver);
    await this.prisma.prequalDocument.delete({ where: { id: documentId } });
  }

  private async getOwnedCase(organizationId: string, caseId: string) {
    const found = await this.prisma.prequalificationCase.findFirst({ where: { id: caseId, organizationId } });
    if (!found) throw new NotFoundException('Dossier de préqualification introuvable.');
    return found;
  }

  private async getOwnedDocument(organizationId: string, caseId: string, documentId: string) {
    const document = await this.prisma.prequalDocument.findFirst({
      where: { id: documentId, prequalificationCaseId: caseId, case: { organizationId } },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    return document;
  }
}
