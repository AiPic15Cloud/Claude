import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MarketDataService } from './market-data.service';
import { CreateRentIndexSeriesDto } from './dto/create-rent-index-series.dto';
import { CreateMarketComparableDto } from './dto/create-market-comparable.dto';

@ApiTags('fractional-market-data')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/market-data')
export class MarketDataController {
  constructor(private readonly service: MarketDataService) {}

  @Get('rent-index-series')
  listRentIndexSeries(@Query('indexType') indexType: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listRentIndexSeries(user, indexType);
  }

  @Post('rent-index-series')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createRentIndexSeries(@Body() dto: CreateRentIndexSeriesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createRentIndexSeries(dto, user);
  }

  @Delete('rent-index-series/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeRentIndexSeries(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeRentIndexSeries(id, user);
  }

  @Get('comparables')
  listMarketComparables(@Query('commune') commune: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listMarketComparables(user, commune);
  }

  @Post('comparables')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createMarketComparable(@Body() dto: CreateMarketComparableDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createMarketComparable(dto, user);
  }

  @Delete('comparables/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeMarketComparable(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeMarketComparable(id, user);
  }
}
