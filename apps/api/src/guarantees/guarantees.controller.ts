import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GuaranteesService } from './guarantees.service';
import { UpsertGuaranteeDto } from './dto/upsert-guarantee.dto';

@ApiTags('guarantees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/guarantees')
export class GuaranteesController {
  constructor(private readonly guaranteesService: GuaranteesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.guaranteesService.list(user.organizationId, dealId);
  }

  @Post()
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: UpsertGuaranteeDto,
  ) {
    return this.guaranteesService.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('id') id: string,
    @Body() dto: Partial<UpsertGuaranteeDto>,
  ) {
    return this.guaranteesService.update(user.organizationId, dealId, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('id') id: string) {
    return this.guaranteesService.remove(user.organizationId, dealId, id);
  }
}
