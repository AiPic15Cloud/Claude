import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { InterestPaymentsService } from './interest-payments.service';
import { CreateInterestPaymentDto } from './dto/create-interest-payment.dto';
import { UpdateInterestPaymentDto } from './dto/update-interest-payment.dto';

@ApiTags('interest-payments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/interest-payments')
export class InterestPaymentsController {
  constructor(private readonly interestPaymentsService: InterestPaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.interestPaymentsService.list(user.organizationId, dealId);
  }

  @Get('status')
  getStatus(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.interestPaymentsService.getStatus(user.organizationId, dealId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateInterestPaymentDto) {
    return this.interestPaymentsService.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':paymentId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('paymentId') paymentId: string,
    @Body() dto: UpdateInterestPaymentDto,
  ) {
    return this.interestPaymentsService.update(user.organizationId, dealId, paymentId, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':paymentId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('paymentId') paymentId: string) {
    return this.interestPaymentsService.remove(user.organizationId, dealId, paymentId);
  }
}
