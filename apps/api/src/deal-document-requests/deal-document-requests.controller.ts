import { Body, Controller, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DealDocumentRequestsService } from './deal-document-requests.service';
import { CreateDealDocumentRequestDto, UpdateDealDocumentRequestDto } from './dto/create-deal-document-request.dto';

@ApiTags('deal-document-requests')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, DetteScopeGuard)
@Controller('deals/:dealId/document-requests')
export class DealDocumentRequestsController {
  constructor(private readonly service: DealDocumentRequestsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.service.list(user.organizationId, dealId);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateDealDocumentRequestDto) {
    return this.service.create(user.organizationId, dealId, user.id, dto);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Patch(':requestId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('requestId') requestId: string,
    @Body() dto: UpdateDealDocumentRequestDto,
  ) {
    return this.service.update(user.organizationId, dealId, requestId, dto);
  }
}
