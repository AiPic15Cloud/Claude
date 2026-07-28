import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GraphService } from '../graph/graph.service';
import { PrismaService } from '../common/prisma/prisma.service';
import { PlatformsSyncService } from './platforms-sync.service';
import { CompetitorProjectsService } from './competitor-projects.service';
import { CreateCompetitorProjectDto } from './dto/create-competitor-project.dto';
import { UpdateCompetitorProjectDto } from './dto/update-competitor-project.dto';

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
    private readonly syncService: PlatformsSyncService,
    private readonly competitorProjects: CompetitorProjectsService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.graphService.listEntities(user.organizationId, { type: 'PLATEFORME' });
  }

  @Post('sync')
  sync(@CurrentUser() user: AuthenticatedUser) {
    return this.syncService.syncFromBarometer(user.organizationId);
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

  @Get(':id/projects')
  listProjects(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.competitorProjects.list(user.organizationId, id);
  }

  @Post(':id/projects')
  createProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: CreateCompetitorProjectDto,
  ) {
    return this.competitorProjects.create(user.organizationId, id, user.id, dto);
  }

  @Patch(':id/projects/:projectId')
  updateProject(
    @CurrentUser() user: AuthenticatedUser,
    @Param('projectId') projectId: string,
    @Body() dto: UpdateCompetitorProjectDto,
  ) {
    return this.competitorProjects.update(user.organizationId, projectId, dto);
  }

  @Delete(':id/projects/:projectId')
  removeProject(@CurrentUser() user: AuthenticatedUser, @Param('projectId') projectId: string) {
    return this.competitorProjects.remove(user.organizationId, projectId);
  }
}
