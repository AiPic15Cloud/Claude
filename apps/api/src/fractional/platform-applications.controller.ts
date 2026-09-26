import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PlatformApplicationsService } from './platform-applications.service';
import { CreatePlatformApplicationDto } from './dto/create-platform-application.dto';
import { UpdatePlatformApplicationDto } from './dto/update-platform-application.dto';

@ApiTags('fractional')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects/:projectId/platform-applications')
export class PlatformApplicationsController {
  constructor(private readonly service: PlatformApplicationsService) {}

  @Get()
  list(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.list(projectId, user);
  }

  @Get('comparison')
  compare(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.compare(projectId, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  create(@Param('projectId') projectId: string, @Body() dto: CreatePlatformApplicationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(projectId, dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  update(
    @Param('projectId') projectId: string,
    @Param('id') id: string,
    @Body() dto: UpdatePlatformApplicationDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.update(projectId, id, dto, user);
  }
}
