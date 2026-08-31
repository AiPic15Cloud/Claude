import { Body, Controller, Delete, Get, HttpCode, HttpStatus, NotFoundException, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { RiskDataService } from '../risk-data/risk-data.service';
import { CompanyMonitoringService } from './company-monitoring.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { SetTagsDto } from './dto/set-tags.dto';
import { ExtendDeadlineDto } from './dto/extend-deadline.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly riskData: RiskDataService,
    private readonly companyMonitoring: CompanyMonitoringService,
  ) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryDealsDto) {
    return this.dealsService.findAll(user.organizationId, query);
  }

  @Get('kpis')
  kpis(@CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.kpis(user.organizationId);
  }

  @Get('newsletters')
  newsletterSummary(@CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.newsletterSummary(user.organizationId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.findOne(user.organizationId, id);
  }

  @Get(':id/mise-en-demeure')
  generateMiseEnDemeure(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.generateMiseEnDemeure(user.organizationId, id);
  }

  @Get(':id/risk-data')
  async getRiskData(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const deal = await this.dealsService.findOne(user.organizationId, id);
    if (deal.lat === null || deal.lng === null) {
      throw new NotFoundException("Ce dossier n'a pas de coordonnées géographiques — impossible de vérifier les risques.");
    }
    const profile = await this.riskData.getRiskProfile(Number(deal.lat), Number(deal.lng));
    await this.dealsService.touchDataCheck(id, 'riskDataCheckedAt');
    return profile;
  }

  @Get(':id/dpe')
  async getDpe(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    const deal = await this.dealsService.findOne(user.organizationId, id);
    if (!deal.postcode) {
      throw new NotFoundException("Ce dossier n'a pas de code postal — impossible de rechercher un DPE.");
    }
    const dpe = await this.riskData.getDpe(deal.address, deal.postcode);
    await this.dealsService.touchDataCheck(id, 'dpeCheckedAt');
    return dpe;
  }

  @Post(':id/check-company')
  checkCompany(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.companyMonitoring.checkOne(user.organizationId, id);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateDealDto) {
    return this.dealsService.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateDealDto) {
    return this.dealsService.update(user.organizationId, id, user.id, dto);
  }

  @Patch(':id/stage')
  changeStage(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ChangeStageDto) {
    return this.dealsService.changeStage(user.organizationId, id, user.id, dto.stage);
  }

  @Patch(':id/tags')
  setTags(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: SetTagsDto) {
    return this.dealsService.setTags(user.organizationId, id, user.id, dto.tagIds);
  }

  @Patch(':id/newsletter')
  pingNewsletter(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.pingNewsletter(user.organizationId, id, user.id);
  }

  @Get(':id/loan-lifecycle')
  getLoanLifecycle(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.getLoanLifecycle(user.organizationId, id);
  }

  @Post(':id/extend-deadline')
  extendDeadline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ExtendDeadlineDto) {
    return this.dealsService.extendDeadline(user.organizationId, id, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.remove(user.organizationId, id);
  }
}
