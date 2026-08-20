import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FieldChangeService } from './field-change.service';

@ApiTags('field-changes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/field-changes')
export class FieldChangeController {
  constructor(private readonly fieldChangeService: FieldChangeService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.fieldChangeService.listForDeal(user.organizationId, dealId);
  }
}
