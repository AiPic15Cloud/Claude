import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { StorageService } from '../common/storage/storage.service';

@Injectable()
export class DocumentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly storage: StorageService,
  ) {}

  async upload(
    organizationId: string,
    dealId: string,
    userId: string,
    file: Express.Multer.File,
  ) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');

    const stored = await this.storage.save(dealId, file.originalname, file.buffer, file.mimetype);

    const document = await this.prisma.document.create({
      data: {
        dealId,
        name: file.originalname,
        mimeType: file.mimetype,
        size: file.size,
        storageKey: stored.storageKey,
        storageDriver: stored.driver,
        uploadedById: userId,
      },
    });

    await this.activities.log(dealId, userId, 'DOCUMENT_ADDED', `Document ajouté : ${file.originalname}`);
    return document;
  }

  async list(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId } });
    if (!deal) throw new NotFoundException('Opération introuvable');
    return this.prisma.document.findMany({ where: { dealId }, orderBy: { createdAt: 'desc' } });
  }

  async getDownloadUrl(organizationId: string, dealId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, dealId, deal: { organizationId } },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    const url = await this.storage.getUrl(document.storageKey, document.storageDriver);
    return { url };
  }

  async readLocalFile(storageKey: string) {
    return this.storage.readLocal(storageKey);
  }

  async remove(organizationId: string, dealId: string, documentId: string) {
    const document = await this.prisma.document.findFirst({
      where: { id: documentId, dealId, deal: { organizationId } },
    });
    if (!document) throw new NotFoundException('Document introuvable');
    await this.storage.delete(document.storageKey, document.storageDriver);
    await this.prisma.document.delete({ where: { id: documentId } });
  }
}
