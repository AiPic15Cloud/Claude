import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { SourceRegistryService } from './source-registry.service';

/** Couverture des sources externes (spec ATLAS v2, C.7) — "ce qu'Atlas voit et ne voit pas". */
@ApiTags('source-registry')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('source-registry')
export class SourceRegistryController {
  constructor(private readonly sourceRegistry: SourceRegistryService) {}

  @Get()
  getCoverage() {
    return this.sourceRegistry.getCoverage();
  }
}
