import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FractionalProjectsService } from './fractional-projects.service';
import { CreateFractionalProjectDto } from './dto/create-fractional-project.dto';
import { UpdateFractionalProjectDto } from './dto/update-fractional-project.dto';
import { UpsertSourcesUsesDto } from './dto/upsert-sources-uses.dto';
import { CreateLeaseDto } from './dto/create-lease.dto';
import { UpdateLeaseDto } from './dto/update-lease.dto';
import { CreateCapexItemDto } from './dto/create-capex-item.dto';
import { CreateValuationDto } from './dto/create-valuation.dto';
import { UpsertVehicleStructureDto } from './dto/upsert-vehicle-structure.dto';
import { CreatePlatformProfileDto } from './dto/create-platform-profile.dto';
import { UpsertAssumptionSetDto } from './dto/upsert-assumption-set.dto';

@ApiTags('fractional')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects')
export class FractionalProjectsController {
  constructor(private readonly service: FractionalProjectsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.service.list(user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.findOne(id, user);
  }

  @Get(':id/synthese')
  synthese(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.computeSynthese(id, user);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  create(@Body() dto: CreateFractionalProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  update(@Param('id') id: string, @Body() dto: UpdateFractionalProjectDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.update(id, dto, user);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.remove(id, user);
  }

  @Post(':id/sources-uses')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertSourcesUses(@Param('id') id: string, @Body() dto: UpsertSourcesUsesDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsertSourcesUses(id, dto, user);
  }

  @Post(':id/leases')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createLease(@Param('id') id: string, @Body() dto: CreateLeaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createLease(id, dto, user);
  }

  @Patch(':id/leases/:leaseId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  updateLease(@Param('id') id: string, @Param('leaseId') leaseId: string, @Body() dto: UpdateLeaseDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.updateLease(id, leaseId, dto, user);
  }

  @Delete(':id/leases/:leaseId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeLease(@Param('id') id: string, @Param('leaseId') leaseId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeLease(id, leaseId, user);
  }

  @Post(':id/capex-items')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createCapexItem(@Param('id') id: string, @Body() dto: CreateCapexItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createCapexItem(id, dto, user);
  }

  @Post(':id/valuations')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createValuation(@Param('id') id: string, @Body() dto: CreateValuationDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createValuation(id, dto, user);
  }

  @Post(':id/vehicle-structure')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertVehicleStructure(@Param('id') id: string, @Body() dto: UpsertVehicleStructureDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsertVehicleStructure(id, dto, user);
  }

  @Post(':id/assumption-sets')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertAssumptionSet(@Param('id') id: string, @Body() dto: UpsertAssumptionSetDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.upsertAssumptionSet(id, dto, user);
  }

  @Get('platform-profiles/all')
  listPlatformProfiles(@CurrentUser() user: AuthenticatedUser) {
    return this.service.listPlatformProfiles(user);
  }

  @Post('platform-profiles')
  @UseGuards(RolesGuard)
  @Roles('ADMIN')
  createPlatformProfile(@Body() dto: CreatePlatformProfileDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createPlatformProfile(dto, user);
  }
}
