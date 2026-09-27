import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ExposureService } from './exposure.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DetteScopeGuard)
@Controller('prequalification/cases/:id/exposure')
export class ExposureController {
  constructor(private readonly service: ExposureService) {}

  @Get()
  getExposure(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getExposure(user.organizationId, id);
  }
}
