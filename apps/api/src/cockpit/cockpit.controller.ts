import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CockpitService } from './cockpit.service';

@ApiTags('cockpit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cockpit')
export class CockpitController {
  constructor(private readonly cockpitService: CockpitService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.cockpitService.summary(user.organizationId, user.id);
  }
}
