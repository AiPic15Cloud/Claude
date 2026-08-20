import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FinancialModelService } from './financial-model.service';
import { UpsertFinancialAssumptionDto } from './dto/upsert-financial-assumption.dto';

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

  @Put()
  upsert(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: UpsertFinancialAssumptionDto,
  ) {
    return this.financialModelService.upsert(user.organizationId, dealId, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete()
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.financialModelService.remove(user.organizationId, dealId, user.id);
  }
}
