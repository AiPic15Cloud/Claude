import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RepaymentsService } from './repayments.service';
import { CreateRepaymentDto } from './dto/create-repayment.dto';
import { UpdateRepaymentDto } from './dto/update-repayment.dto';

@ApiTags('repayments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/repayments')
export class RepaymentsController {
  constructor(private readonly repaymentsService: RepaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.repaymentsService.list(user.organizationId, dealId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateRepaymentDto) {
    return this.repaymentsService.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':repaymentId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('repaymentId') repaymentId: string,
    @Body() dto: UpdateRepaymentDto,
  ) {
    return this.repaymentsService.update(user.organizationId, dealId, repaymentId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':repaymentId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('repaymentId') repaymentId: string,
  ) {
    return this.repaymentsService.remove(user.organizationId, dealId, repaymentId);
  }
}
