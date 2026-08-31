import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RelationshipsService } from './relationships.service';
import { CreateRelationshipDto } from './dto/create-relationship.dto';
import { AddEvidenceDto } from './dto/add-evidence.dto';
import { UpdateRelationshipDto } from './dto/update-relationship.dto';

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
  constructor(private readonly relationships: RelationshipsService) {}

  @Get('entities/:id/relationships')
  listForEntity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.relationships.listForEntity(user.organizationId, id);
  }

  @Post('relationships')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRelationshipDto) {
    return this.relationships.create(user.organizationId, user.id, dto);
  }

  @Post('relationships/:id/evidence')
  addEvidence(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: AddEvidenceDto) {
    return this.relationships.addEvidence(user.organizationId, user.id, id, dto);
  }

  @Patch('relationships/:id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateRelationshipDto) {
    return this.relationships.update(user.organizationId, id, dto);
  }
}
