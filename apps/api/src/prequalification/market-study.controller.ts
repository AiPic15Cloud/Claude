import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MarketStudyService } from './market-study.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DetteScopeGuard)
@Controller('prequalification/cases')
export class MarketStudyController {
  constructor(private readonly service: MarketStudyService) {}

  @Get(':id/market-study')
  getMarketStudy(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getMarketStudy(user.organizationId, id);
  }
}
