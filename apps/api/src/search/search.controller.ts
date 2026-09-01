import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { MeilisearchService } from './meilisearch.service';

@ApiTags('search')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('search')
export class SearchController {
  constructor(private readonly meilisearch: MeilisearchService) {}

  @Get()
  search(@CurrentUser() user: AuthenticatedUser, @Query('q') q = '') {
    return this.meilisearch.search(user.organizationId, q);
  }
}
