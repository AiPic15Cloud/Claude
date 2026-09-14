import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { TechnicalDdService } from './technical-dd.service';
import { UpsertTechnicalAssessmentDto } from './dto/upsert-technical-assessment.dto';

@ApiTags('fractional-technical-dd')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects/:projectId/technical-dd')
export class TechnicalDdController {
  constructor(private readonly service: TechnicalDdService) {}

  @Get()
  getAssessment(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getAssessment(projectId, user);
  }

  @Put(':subBlock')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertAssessment(
    @Param('projectId') projectId: string,
    @Param('subBlock') subBlock: string,
    @Body() dto: UpsertTechnicalAssessmentDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsertAssessment(projectId, subBlock, dto, user);
  }
}
