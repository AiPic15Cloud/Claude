import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CostLineItemService } from './cost-line-item.service';
import { CreateCostLineItemDto, UpdateCostLineItemDto } from './dto/cost-line-item.dto';

@ApiTags('cost-line-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/cost-line-items')
export class CostLineItemController {
  constructor(private readonly costLineItemService: CostLineItemService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.costLineItemService.list(user.organizationId, dealId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateCostLineItemDto) {
    return this.costLineItemService.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':itemId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('itemId') itemId: string,
    @Body() dto: UpdateCostLineItemDto,
  ) {
    return this.costLineItemService.update(user.organizationId, dealId, itemId, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':itemId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('itemId') itemId: string) {
    return this.costLineItemService.remove(user.organizationId, dealId, itemId, user.id);
  }
}
