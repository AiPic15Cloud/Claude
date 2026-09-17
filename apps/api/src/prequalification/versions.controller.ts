import { BadRequestException, Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { VersionsService } from './versions.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases/:id/versions')
export class VersionsController {
  constructor(private readonly service: VersionsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.list(user.organizationId, id);
  }

  @Get('compare')
  compare(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Query('a') a: string, @Query('b') b: string) {
    const versionA = Number(a);
    const versionB = Number(b);
    if (!Number.isInteger(versionA) || !Number.isInteger(versionB)) {
      throw new BadRequestException('Les paramètres a et b doivent être des numéros de version entiers.');
    }
    return this.service.compare(user.organizationId, id, versionA, versionB);
  }
}
