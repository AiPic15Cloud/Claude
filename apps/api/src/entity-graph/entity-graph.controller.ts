import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../common/prisma/prisma.service';
import { RelationshipsService } from './relationships.service';
import { EntityIntelligenceService } from './entity-intelligence.service';
import { GroupBuilderService } from './group-builder.service';
import { LegalEventsService } from './legal-events.service';
import { EntityResolutionService } from './entity-resolution.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { UpdateRelationshipDto } from './dto/update-relationship.dto';
import { ResolveCompanyDto } from './dto/resolve-company.dto';

/**
 * Fondation du Knowledge Graph v2 (B.2) — distinct de /graph (ancien modèle
 * GraphEntity/GraphRelation, toujours utilisé par le graphe visuel). Aucune
 * UI ne consomme encore ces routes ; elles existent pour que la donnée
 * (relations + preuves + historique) ait un endroit honnête où vivre avant
 * que B.3 ne construise les requêtes déterministes dessus.
 */
@ApiTags('entity-graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller()
export class EntityGraphController {
  constructor(
    private readonly relationships: RelationshipsService,
    private readonly intelligence: EntityIntelligenceService,
    private readonly groupBuilder: GroupBuilderService,
    private readonly legalEvents: LegalEventsService,
    private readonly entityResolution: EntityResolutionService,
    private readonly prisma: PrismaService,
  ) {}

  @Get('entities/:id/relationships')
  listForEntity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.relationships.listForEntity(user.organizationId, id);
  }

  /** Fiche contrepartie enrichie (spec ATLAS v2, B.3) — requêtes déterministes de premier niveau. */
  @Get('entities/:id/summary')
  getSummary(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.intelligence.getSummary(user.organizationId, id);
  }

  /** Liste statique (7 valeurs seedées) — pas de service dédié pour ça. */
  @Get('relationship-types')
  listRelationshipTypes() {
    return this.prisma.relationshipType.findMany({ orderBy: { label: 'asc' } });
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post('relationships')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRelationshipDto) {
    return this.relationships.create(user.organizationId, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post('relationships/:id/evidence')
  addEvidence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddEvidenceDto) {
    return this.relationships.addEvidence(user.organizationId, user.id, id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch('relationships/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRelationshipDto) {
    return this.relationships.update(user.organizationId, id, dto);
  }

  /** Clôture transitive du groupe économique (spec V2 §16 "Group Builder") — lecture live, jamais la table matérialisée seule. */
  @Get('entities/:id/economic-group')
  async getEconomicGroup(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.relationships.assertEntity(user.organizationId, id);
    const memberIds = await this.groupBuilder.getGroupEntityIds(user.organizationId, id);
    if (memberIds.size === 0) return { members: [] };
    const members = await this.prisma.entity.findMany({
      where: { id: { in: [...memberIds] }, organizationId: user.organizationId },
      select: { id: true, name: true, type: true },
    });
    return { members };
  }

  /** Journal des événements juridiques (spec V2 §9) — RJ/LJ/sauvegarde détectés via BODACC ou saisis manuellement. */
  @Get('entities/:id/legal-events')
  async listLegalEvents(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    await this.relationships.assertEntity(user.organizationId, id);
    return this.legalEvents.list(user.organizationId, id);
  }

  /** Recherche externe par dénomination (recherche-entreprises.api.gouv.fr) — propose des candidats SIREN, n'écrit rien. */
  @Get('entity-resolution/search')
  searchCompanies(@Query('name') name: string, @Query('city') city?: string) {
    if (!name?.trim()) return [];
    return this.entityResolution.searchExternalCandidates(name.trim(), city?.trim());
  }

  /** Entity Resolution Engine (spec V2 §7.1) — résout ou crée l'entité canonique, jamais de fusion automatique sur candidats ambigus. */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post('entity-resolution/companies')
  resolveCompany(@CurrentUser() user: AuthenticatedUser, @Body() dto: ResolveCompanyDto) {
    return this.entityResolution.resolveCompany(user.organizationId, dto);
  }
}
