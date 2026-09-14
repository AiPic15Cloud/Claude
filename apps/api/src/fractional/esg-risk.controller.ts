import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { EsgRiskService } from './esg-risk.service';
import { UpsertEsgAssessmentDto } from './dto/upsert-esg-assessment.dto';

@ApiTags('fractional-esg-risk')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects/:projectId/esg-risk')
export class EsgRiskController {
  constructor(private readonly service: EsgRiskService) {}

  @Get()
  getProfile(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getProfile(projectId, user);
  }

  @Put()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertAssessment(@Param('projectId') projectId: string, @Body() dto: UpsertEsgAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsertAssessment(projectId, dto, user);
  }
}
