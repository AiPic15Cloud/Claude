import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { RiskEngineService } from './risk-engine.service';

/** Vues niveau portefeuille du Risk Engine (méthodologie, validation rétrospective) — distinct de RiskEngineController, scopé par dossier. */
@ApiTags('risk-model')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('risk-model')
export class RiskModelController {
  constructor(private readonly riskEngineService: RiskEngineService) {}

  @Get('methodology')
  methodology() {
    return this.riskEngineService.getMethodology();
  }

  @Get('validation')
  validation(@CurrentUser() user: AuthenticatedUser) {
    return this.riskEngineService.getModelValidation(user.organizationId);
  }
}
