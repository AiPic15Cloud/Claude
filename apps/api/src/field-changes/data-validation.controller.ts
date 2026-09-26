import { BadRequestException, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DataValidationService } from './data-validation.service';
import { VALID_FIELD_CHANGE_ENTITY_TYPES } from './field-change.service';

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

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post(':entityType')
  validate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('entityType') entityType: string,
  ) {
    if (!(VALID_FIELD_CHANGE_ENTITY_TYPES as readonly string[]).includes(entityType)) {
      throw new BadRequestException(`entityType inconnu : "${entityType}"`);
    }
    return this.dataValidationService.validate(user.organizationId, dealId, entityType, user.id);
  }
}
