import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MarketStudyService } from './market-study.service';
import { MarketPriceService } from '../deals/market-price/market-price.service';
import { MarketPriceQueryDto } from '../deals/dto/market-price-query.dto';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DetteScopeGuard)
@Controller('prequalification/cases')
export class MarketStudyController {
  constructor(
    private readonly service: MarketStudyService,
    private readonly marketPrice: MarketPriceService,
  ) {}

  @Get(':id/market-study')
  getMarketStudy(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getMarketStudy(user.organizationId, id);
  }

  /** Recherche de prix au m² à la demande (spec ATLAS v2, C.8) — mêmes 6 sources que l'onglet Marché des Deals. */
  @Get(':id/market-price')
  searchMarketPrice(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query() query: MarketPriceQueryDto) {
    return this.marketPrice.searchForPrequalCase(user.organizationId, id, query.typology);
  }
}
