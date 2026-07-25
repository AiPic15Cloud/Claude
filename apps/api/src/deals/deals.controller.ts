import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { QueryDealsDto } from './dto/query-deals.dto';
import { ChangeStageDto } from './dto/change-stage.dto';
import { SetTagsDto } from './dto/set-tags.dto';

@ApiTags('deals')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals')
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryDealsDto) {
    return this.dealsService.findAll(user.organizationId, query);
  }

  @Get('kpis')
  kpis(@CurrentUser() user: AuthenticatedUser) {
    return this.dealsService.kpis(user.organizationId);
  }

  @Get(':id')
  findOne(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.findOne(user.organizationId, id);
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

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.dealsService.remove(user.organizationId, id);
  }
}
