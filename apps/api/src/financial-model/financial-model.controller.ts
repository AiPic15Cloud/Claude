import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FinancialModelService } from './financial-model.service';
import { UpsertFinancialAssumptionDto } from './dto/upsert-financial-assumption.dto';
import { ComputeScenariosDto } from './dto/compute-scenarios.dto';

@ApiTags('financial-model')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/financial-model')
export class FinancialModelController {
  constructor(private readonly financialModelService: FinancialModelService) {}

  @Get()
  get(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.financialModelService.get(user.organizationId, dealId);
  }

  @Get('bp-comparison')
  getBpComparison(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.financialModelService.getBpComparison(user.organizationId, dealId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post('lock-baseline')
  lockBaseline(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.financialModelService.lockBaseline(user.organizationId, dealId, user.id);
  }

  @Post('scenarios')
  computeScenarios(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: ComputeScenariosDto) {
    return this.financialModelService.computeScenarios(user.organizationId, dealId, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: UpsertFinancialAssumptionDto,
  ) {
    return this.financialModelService.upsert(user.organizationId, dealId, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.financialModelService.remove(user.organizationId, dealId, user.id);
  }
}
