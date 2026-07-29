import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { StorageService } from '../common/storage/storage.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { withNoteImageUrls } from './note-image.util';

const NOTE_INCLUDE = {
  author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
  images: true,
} as const;

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
    private readonly storage: StorageService,
  ) {}

  private async assertDealAccess(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  async create(organizationId: string, dealId: string, authorId: string, dto: CreateNoteDto, files: Express.Multer.File[] = []) {
    await this.assertDealAccess(organizationId, dealId);
    const note = await this.prisma.note.create({
      data: {
        dealId,
        authorId,
        content: dto.content,
        images: {
          create: await Promise.all(
            files.map(async (file) => {
              const stored = await this.storage.save(dealId, file.originalname, file.buffer, file.mimetype);
              return { mimeType: file.mimetype, storageKey: stored.storageKey, storageDriver: stored.driver };
            }),
          ),
        },
      },
      include: NOTE_INCLUDE,
    });
    await this.activities.log(dealId, authorId, 'NOTE_ADDED', 'Note ajoutée');
    return withNoteImageUrls(note, this.storage);
  }

  async list(organizationId: string, dealId: string) {
    await this.assertDealAccess(organizationId, dealId);
    const notes = await this.prisma.note.findMany({
      where: { dealId },
      include: NOTE_INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
    return Promise.all(notes.map((note) => withNoteImageUrls(note, this.storage)));
  }

  async remove(organizationId: string, dealId: string, noteId: string, userId: string) {
    await this.assertDealAccess(organizationId, dealId);
    const note = await this.prisma.note.findFirst({ where: { id: noteId, dealId }, include: { images: true } });
    if (!note) throw new NotFoundException('Note introuvable');
    if (note.authorId !== userId) throw new ForbiddenException("Vous ne pouvez supprimer que vos notes");
    await Promise.all(note.images.map((image) => this.storage.delete(image.storageKey, image.storageDriver)));
    await this.prisma.note.delete({ where: { id: noteId } });
  }
}
