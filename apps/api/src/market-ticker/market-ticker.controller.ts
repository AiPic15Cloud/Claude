import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MarketTickerService } from './market-ticker.service';

@ApiTags('market-ticker')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market-ticker')
export class MarketTickerController {
  constructor(private readonly marketTickerService: MarketTickerService) {}

  @Get()
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.marketTickerService.summary(user.organizationId);
  }
}
