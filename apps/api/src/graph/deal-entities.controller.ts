import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { GraphService } from './graph.service';
import { LinkDealEntityDto } from './dto/link-deal-entity.dto';

@ApiTags('graph')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/entities')
export class DealEntitiesController {
  constructor(private readonly graphService: GraphService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.graphService.listDealLinks(user.organizationId, dealId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post()
  link(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: LinkDealEntityDto) {
    return this.graphService.linkDeal(user.organizationId, dealId, dto.entityId, dto.role);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':linkId')
  unlink(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('linkId') linkId: string,
  ) {
    return this.graphService.unlinkDeal(user.organizationId, dealId, linkId);
  }
}
