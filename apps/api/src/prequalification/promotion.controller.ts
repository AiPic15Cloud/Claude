import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PromotionService } from './promotion.service';
import { ValidateCaseDto } from './dto/validate-case.dto';

/** Réservé à ADMIN/ANALYST — décision utilisateur explicite (pas de rôle RISK_MANAGER dans ATLAS). */
@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('ADMIN', 'ANALYST')
@Controller('prequalification/cases/:id/validate')
export class PromotionController {
  constructor(private readonly service: PromotionService) {}

  @Post()
  validateAndPromote(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: ValidateCaseDto) {
    return this.service.validateAndPromote(user.organizationId, id, user.id, dto);
  }
}
