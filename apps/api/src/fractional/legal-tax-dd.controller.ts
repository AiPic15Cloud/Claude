import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { LegalTaxDdService } from './legal-tax-dd.service';
import { UpsertLegalTaxItemStatusDto } from './dto/upsert-legal-tax-item-status.dto';

@ApiTags('fractional-legal-tax-dd')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects/:projectId/legal-tax-dd')
export class LegalTaxDdController {
  constructor(private readonly service: LegalTaxDdService) {}

  @Get()
  getSummary(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getSummary(projectId, user);
  }

  @Put(':block/:itemKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertItemStatus(
    @Param('projectId') projectId: string,
    @Param('block') block: string,
    @Param('itemKey') itemKey: string,
    @Body() dto: UpsertLegalTaxItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsertItemStatus(projectId, block, itemKey, dto, user);
  }
}
