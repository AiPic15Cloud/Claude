import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DealOverrideService } from './deal-override.service';
import { SetAnalystOverrideDto } from './dto/set-analyst-override.dto';

@ApiTags('risk-engine')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/risk')
export class DealOverrideController {
  constructor(private readonly dealOverrideService: DealOverrideService) {}

  @Get('override-history')
  history(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.dealOverrideService.getHistory(user.organizationId, dealId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post('analyst-override')
  set(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: SetAnalystOverrideDto) {
    return this.dealOverrideService.set(user.organizationId, dealId, user.id, dto.overrideStatus, dto.justification);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete('analyst-override')
  clear(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.dealOverrideService.clear(user.organizationId, dealId, user.id);
  }
}
