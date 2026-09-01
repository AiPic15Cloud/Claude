import { Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DataValidationService } from './data-validation.service';

@ApiTags('data-validations')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/validations')
export class DataValidationController {
  constructor(private readonly dataValidationService: DataValidationService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.dataValidationService.getStatus(user.organizationId, dealId);
  }

  @Post(':entityType')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('entityType') entityType: string,
  ) {
    return this.dataValidationService.validate(user.organizationId, dealId, entityType, user.id);
  }
}
