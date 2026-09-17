import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { EvidenceService } from './evidence.service';
import { UpsertEvidenceDto } from './dto/upsert-evidence.dto';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases/:caseId/evidence')
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string) {
    return this.service.list(user.organizationId, caseId);
  }

  @Put(':entityType/:entityId/:fieldKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('caseId') caseId: string,
    @Param('entityType') entityType: string,
    @Param('entityId') entityId: string,
    @Param('fieldKey') fieldKey: string,
    @Body() dto: UpsertEvidenceDto,
  ) {
    return this.service.upsert(user.organizationId, caseId, entityType, entityId, fieldKey, user.id, dto);
  }
}
