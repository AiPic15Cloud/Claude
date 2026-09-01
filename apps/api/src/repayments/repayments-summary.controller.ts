import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RepaymentsService } from './repayments.service';

@ApiTags('repayments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('repayments')
export class RepaymentsSummaryController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.repaymentsService.summary(user.organizationId, y);
  }

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.repaymentsService.listForOrganization(user.organizationId, y);
  }
}
