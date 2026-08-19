import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RiskEngineService } from './risk-engine.service';

@ApiTags('risk-engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/risk')
export class RiskEngineController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.riskEngineService.computeDealRisk(user.organizationId, dealId, false);
  }

  @Post('recompute')
  recompute(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.riskEngineService.computeDealRisk(user.organizationId, dealId, true);
  }
}
