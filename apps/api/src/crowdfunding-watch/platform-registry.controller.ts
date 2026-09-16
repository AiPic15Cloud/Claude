import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { PlatformRegistryService } from './platform-registry.service';
import { UpsertPlatformDto } from './dto/upsert-platform.dto';
import { UpdatePlatformDto } from './dto/update-platform.dto';

/** Registre extensible des plateformes de crowdfunding (spec Lot 1 §1) — l'écriture reste réservée aux rôles qui décident quelles sources Atlas surveille. */
@ApiTags('crowdfunding-watch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crowdfunding-watch/platforms')
export class PlatformRegistryController {
  constructor(private readonly platformRegistry: PlatformRegistryService) {}

  @Get()
  list() {
    return this.platformRegistry.list();
  }

  @Get(':sourceKey')
  get(@Param('sourceKey') sourceKey: string) {
    return this.platformRegistry.get(sourceKey);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  create(@Body() dto: UpsertPlatformDto) {
    return this.platformRegistry.create(dto);
  }

  @Patch(':sourceKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  update(@Param('sourceKey') sourceKey: string, @Body() dto: UpdatePlatformDto) {
    return this.platformRegistry.update(sourceKey, dto);
  }
}
