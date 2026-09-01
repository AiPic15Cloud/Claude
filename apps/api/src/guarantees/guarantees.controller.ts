import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GuaranteesService } from './guarantees.service';
import { UpsertGuaranteeDto } from './dto/upsert-guarantee.dto';
import { MarkSubstantiveDefectDto } from './dto/mark-substantive-defect.dto';

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

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch(':id/verify')
  markVerified(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('id') id: string) {
    return this.guaranteesService.markVerified(user.organizationId, dealId, id, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch(':id/substantive-defect')
  markSubstantiveDefect(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('id') id: string,
    @Body() dto: MarkSubstantiveDefectDto,
  ) {
    return this.guaranteesService.markSubstantiveDefect(user.organizationId, dealId, id, user.id, dto.flagged, dto.note);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('id') id: string) {
    return this.guaranteesService.remove(user.organizationId, dealId, id);
  }
}
