import { Body, Controller, Get, Param, Patch, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { EntityLinkReviewService } from './entity-link-review.service';
import { RejectEntityLinkDto } from './dto/reject-entity-link.dto';

/** File de validation manuelle des rapprochements porteur Atlas ↔ collecte externe (spec §4). */
@ApiTags('crowdfunding-watch')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('crowdfunding-watch/entity-links')
export class EntityLinkReviewController {
  constructor(private readonly entityLinkReview: EntityLinkReviewService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: 'SUGGESTED' | 'CONFIRMED' | 'REJECTED', @Query('entityId') entityId?: string) {
    return this.entityLinkReview.listForOrganization(user.organizationId, status, entityId);
  }

  @Patch(':id/confirm')
  confirm(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.entityLinkReview.confirm(user.organizationId, id, user.id);
  }

  @Patch(':id/reject')
  reject(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser, @Body() dto: RejectEntityLinkDto) {
    return this.entityLinkReview.reject(user.organizationId, id, user.id, dto.reason);
  }
}
