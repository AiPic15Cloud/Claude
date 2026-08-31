import { Body, Controller, Get, Param, Patch, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PlaybooksService } from './playbooks.service';
import { UpdateAnchorDateDto } from './dto/update-anchor-date.dto';

@ApiTags('playbooks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/playbooks')
export class PlaybooksController {
  constructor(private readonly playbooks: PlaybooksService) {}

  @Get()
  listForDeal(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.playbooks.listForDeal(user.organizationId, dealId);
  }

  @Patch(':instanceId/anchor-date')
  updateAnchorDate(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('instanceId') instanceId: string,
    @Body() dto: UpdateAnchorDateDto,
  ) {
    return this.playbooks.updateAnchorDate(user.organizationId, dealId, instanceId, new Date(dto.anchorDate));
  }
}
