import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma/prisma.service';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async createWithUniqueSlug(name: string) {
    const base = slugify(name) || 'organisation';
    let slug = base;
    let suffix = 1;
    // eslint-disable-next-line no-constant-condition
    while (true) {
      const existing = await this.prisma.organization.findUnique({ where: { slug } });
      if (!existing) break;
      suffix += 1;
      slug = `${base}-${suffix}`;
    }
    return this.prisma.organization.create({ data: { name, slug } });
  }
}
