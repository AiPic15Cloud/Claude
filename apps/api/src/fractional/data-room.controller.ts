import { Body, Controller, Get, Param, Put, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DataRoomService } from './data-room.service';
import { UpsertDataRoomItemStatusDto } from './dto/upsert-data-room-item-status.dto';

@ApiTags('fractional-data-room')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/projects/:projectId/data-room')
export class DataRoomController {
  constructor(private readonly service: DataRoomService) {}

  @Get('completeness')
  getCompleteness(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getCompleteness(projectId, user);
  }

  @Put(':block/:itemKey')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertItemStatus(
    @Param('projectId') projectId: string,
    @Param('block') block: string,
    @Param('itemKey') itemKey: string,
    @Body() dto: UpsertDataRoomItemStatusDto,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.service.upsertItemStatus(projectId, block, itemKey, dto, user);
  }
}
