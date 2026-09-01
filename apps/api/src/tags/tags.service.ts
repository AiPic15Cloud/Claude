import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';
import { CreateTagDto } from './dto/create-tag.dto';

@Injectable()
export class TagsService {
  constructor(private readonly prisma: PrismaService) {}

  list(organizationId: string) {
    return this.prisma.tag.findMany({ where: { organizationId }, orderBy: { name: 'asc' } });
  }

  async create(organizationId: string, dto: CreateTagDto) {
    const existing = await this.prisma.tag.findUnique({
      where: { organizationId_name: { organizationId, name: dto.name } },
    });
    if (existing) throw new ConflictException('Ce tag existe déjà');

    return this.prisma.tag.create({
      data: { organizationId, name: dto.name, color: dto.color ?? '#6366f1' },
    });
  }

  async remove(organizationId: string, id: string) {
    const tag = await this.prisma.tag.findFirst({ where: { id, organizationId } });
    if (!tag) throw new NotFoundException('Tag introuvable');
    await this.prisma.tag.delete({ where: { id } });
  }
}
