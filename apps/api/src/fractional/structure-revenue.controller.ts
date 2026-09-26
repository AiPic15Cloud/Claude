import { Body, Controller, Get, Param, ParseIntPipe, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { StructureRevenueService } from './structure-revenue.service';
import { UpsertStructureTargetDto } from './dto/upsert-structure-target.dto';

@ApiTags('fractional')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/structure-revenue')
export class StructureRevenueController {
  constructor(private readonly service: StructureRevenueService) {}

  @Get(':year/forecast')
  getForecast(@Param('year', ParseIntPipe) year: number, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getForecast(user.organizationId, year);
  }

  @Put(':year/target')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertTarget(@Param('year', ParseIntPipe) year: number, @Body() dto: UpsertStructureTargetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsertTarget(user.organizationId, year, dto, user);
  }
}
