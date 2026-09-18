import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StressTestService } from './stress-test.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases')
export class StressTestController {
  constructor(private readonly service: StressTestService) {}

  @Get(':id/stress-tests')
  getStressTests(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getStressTests(user.organizationId, id);
  }
}
