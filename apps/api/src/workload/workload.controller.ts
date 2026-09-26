import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { WorkloadService } from './workload.service';

@ApiTags('workload')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('workload')
export class WorkloadController {
  constructor(private readonly workloadService: WorkloadService) {}

  @Get()
  getSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.workloadService.getSummary(user.organizationId);
  }
}
