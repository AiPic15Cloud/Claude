import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StressTestService } from './stress-test.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DetteScopeGuard)
@Controller('prequalification/cases')
export class StressTestController {
  constructor(private readonly service: StressTestService) {}

  @Get(':id/stress-tests')
  getStressTests(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getStressTests(user.organizationId, id);
  }

  @Get(':id/stress-tests/sensitivity-grid')
  getMarginSensitivityGrid(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getMarginSensitivityGrid(user.organizationId, id);
  }
}
