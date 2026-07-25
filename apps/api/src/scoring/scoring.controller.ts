import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ScoringService } from './scoring.service';

@ApiTags('scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/score')
export class ScoringController {
  constructor(private readonly scoringService: ScoringService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.scoringService.computeDealScore(user.organizationId, dealId, false);
  }

  @Post('recompute')
  recompute(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.scoringService.computeDealScore(user.organizationId, dealId, true);
  }
}
