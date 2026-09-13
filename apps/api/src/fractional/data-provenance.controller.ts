import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DataProvenanceService } from './data-provenance.service';
import { UpsertDataProvenanceDto } from './dto/upsert-data-provenance.dto';

@ApiTags('fractional-data-provenance')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/data-provenance')
export class DataProvenanceController {
  constructor(private readonly service: DataProvenanceService) {}

  @Get(':entityType/:entityId')
  listForEntity(@Param('entityType') entityType: string, @Param('entityId') entityId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listForEntity(entityType, entityId, user);
  }

  @Put(':entityType/:entityId/:fieldKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsert(
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('fieldKey') fieldKey: string,
    @Body() dto: UpsertDataProvenanceDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsert(entityType, entityId, fieldKey, dto, user);
  }

  @Get('projects/:projectId/confidence')
  getDataConfidenceForProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getDataConfidenceForProject(projectId, user);
  }
}
