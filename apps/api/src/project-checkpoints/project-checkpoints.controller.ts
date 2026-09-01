import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ProjectCheckpointsService } from './project-checkpoints.service';
import { CreateCheckpointDto } from './dto/create-checkpoint.dto';

@ApiTags('project-checkpoints')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/checkpoints')
export class ProjectCheckpointsController {
  constructor(private readonly service: ProjectCheckpointsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.service.list(user.organizationId, dealId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateCheckpointDto) {
    return this.service.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':checkpointId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('checkpointId') checkpointId: string,
    @Body() dto: CreateCheckpointDto,
  ) {
    return this.service.update(user.organizationId, dealId, checkpointId, user.id, dto);
  }
}
