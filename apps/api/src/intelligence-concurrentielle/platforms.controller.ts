import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GraphService } from '../graph/graph.service';
import { PrismaService } from '../common/prisma/prisma.service';

/**
 * Intelligence Concurrentielle — platform profiles. A platform is a
 * GraphEntity of type PLATEFORME; this controller layers a
 * competitor-profile view (linked deals, related articles) on top of the
 * generic Knowledge Graph endpoints.
 */
@ApiTags('intelligence-concurrentielle')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('platforms')
export class PlatformsController {
  constructor(
    private readonly graphService: GraphService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.graphService.listEntities(user.organizationId, { type: 'PLATEFORME' });
  }

  @Get(':id')
  async profile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const entity = await this.graphService.getEntity(user.organizationId, id);
    const recentArticles = await this.prisma.article.findMany({
      where: { organizationId: user.organizationId, entities: { some: { entityId: id } } },
      orderBy: { publishedAt: 'desc' },
      take: 10,
    });
    return { ...entity, recentArticles };
  }
}
