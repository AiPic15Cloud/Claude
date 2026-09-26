import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ProjectMilestonesService } from './project-milestones.service';
import { CreateMilestoneDto } from './dto/create-milestone.dto';
import { UpdateMilestoneDto } from './dto/update-milestone.dto';
import { ReorderMilestonesDto } from './dto/reorder-milestones.dto';

@ApiTags('project-milestones')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/milestones')
export class ProjectMilestonesController {
  constructor(private readonly milestonesService: ProjectMilestonesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.milestonesService.list(user.organizationId, dealId);
  }

  @Get('progress')
  getProgress(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.milestonesService.getProgress(user.organizationId, dealId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateMilestoneDto) {
    return this.milestonesService.create(user.organizationId, dealId, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch('reorder')
  reorder(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: ReorderMilestonesDto) {
    return this.milestonesService.reorder(user.organizationId, dealId, dto.orderedIds);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('id') id: string,
    @Body() dto: UpdateMilestoneDto,
  ) {
    return this.milestonesService.update(user.organizationId, dealId, id, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('id') id: string) {
    return this.milestonesService.remove(user.organizationId, dealId, id);
  }
}
