import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { GraphEntityType } from '@prisma/client';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GraphService } from './graph.service';
import { CreateEntityDto } from './dto/create-entity.dto';
import { UpdateEntityDto } from './dto/update-entity.dto';
import { CreateRelationDto } from './dto/create-relation.dto';
import { QueryEntitiesDto } from './dto/query-entities.dto';

@ApiTags('graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('graph')
export class GraphController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  getGraph(@CurrentUser() user: AuthenticatedUser, @Query('types') types?: string) {
    const parsed = types ? (types.split(',') as GraphEntityType[]) : undefined;
    return this.graphService.getGraph(user.organizationId, parsed);
  }

  @Get('entities')
  listEntities(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryEntitiesDto) {
    return this.graphService.listEntities(user.organizationId, query);
  }

  @Get('entities/:id')
  getEntity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.graphService.getEntity(user.organizationId, id);
  }

  @Post('entities')
  createEntity(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateEntityDto) {
    return this.graphService.createEntity(user.organizationId, dto);
  }

  @Patch('entities/:id')
  updateEntity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateEntityDto) {
    return this.graphService.updateEntity(user.organizationId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('entities/:id')
  removeEntity(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.graphService.removeEntity(user.organizationId, id);
  }

  @Post('relations')
  createRelation(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateRelationDto) {
    return this.graphService.createRelation(user.organizationId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('relations/:id')
  removeRelation(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.graphService.removeRelation(user.organizationId, id);
  }
}
