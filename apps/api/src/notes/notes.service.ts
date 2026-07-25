import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { ActivitiesService } from '../activities/activities.service';
import { CreateNoteDto } from './dto/create-note.dto';

@Injectable()
export class NotesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activities: ActivitiesService,
  ) {}

  private async assertDealAccess(organizationId: string, dealId: string) {
    const deal = await this.prisma.deal.findFirst({ where: { id: dealId, organizationId }, select: { id: true } });
    if (!deal) throw new NotFoundException('Opération introuvable');
  }

  async create(organizationId: string, dealId: string, authorId: string, dto: CreateNoteDto) {
    await this.assertDealAccess(organizationId, dealId);
    const note = await this.prisma.note.create({
      data: { dealId, authorId, content: dto.content },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
    });
    await this.activities.log(dealId, authorId, 'NOTE_ADDED', 'Note ajoutée');
    return note;
  }

  async list(organizationId: string, dealId: string) {
    await this.assertDealAccess(organizationId, dealId);
    return this.prisma.note.findMany({
      where: { dealId },
      include: { author: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async remove(organizationId: string, dealId: string, noteId: string, userId: string) {
    await this.assertDealAccess(organizationId, dealId);
    const note = await this.prisma.note.findFirst({ where: { id: noteId, dealId } });
    if (!note) throw new NotFoundException('Note introuvable');
    if (note.authorId !== userId) throw new ForbiddenException("Vous ne pouvez supprimer que vos notes");
    await this.prisma.note.delete({ where: { id: noteId } });
  }
}
