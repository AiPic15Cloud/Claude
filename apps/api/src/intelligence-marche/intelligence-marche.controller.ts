import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { IntelligenceMarcheService } from './intelligence-marche.service';
import { MarketIndicatorsService } from './indicators.service';
import { MarketDigestService } from './market-digest.service';
import { CreateSourceDto } from './dto/create-source.dto';
import { CreateArticleDto } from './dto/create-article.dto';
import { QueryArticlesDto } from './dto/query-articles.dto';

@ApiTags('intelligence-marche')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('market-intelligence')
export class IntelligenceMarcheController {
  constructor(
    private readonly service: IntelligenceMarcheService,
    private readonly indicators: MarketIndicatorsService,
    private readonly digest: MarketDigestService,
  ) {}

  @Get('indicators')
  getIndicators() {
    return this.indicators.summary();
  }

  @Get('digest')
  getDigest(@CurrentUser() user: AuthenticatedUser) {
    return this.digest.getDigest(user.organizationId);
  }

  @Get('connectors')
  listConnectors() {
    return this.service.listConnectors();
  }

  @Get('sources')
  listSources(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listSources(user.organizationId);
  }

  @Post('sources')
  createSource(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSourceDto) {
    return this.service.createSource(user.organizationId, dto);
  }

  @Patch('sources/:id')
  setActive(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id') id: string,
    @Body('active') active: boolean,
  ) {
    return this.service.setSourceActive(user.organizationId, id, active);
  }

  @Post('sources/:id/fetch')
  fetch(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.enqueueFetch(user.organizationId, id);
  }

  @Post('sources/collect-all')
  collectAll(@CurrentUser() user: AuthenticatedUser) {
    return this.service.collectAll(user.organizationId);
  }

  @Get('articles')
  listArticles(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryArticlesDto) {
    return this.service.listArticles(user.organizationId, query);
  }

  @Post('articles')
  createArticle(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateArticleDto) {
    return this.service.createManualArticle(user.organizationId, dto);
  }
}
