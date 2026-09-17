import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { DataRoomService } from './data-room.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases')
export class DataRoomController {
  constructor(private readonly service: DataRoomService) {}

  @Get(':id/data-room-suggestions')
  getSuggestions(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getSuggestions(user.organizationId, id);
  }
}
