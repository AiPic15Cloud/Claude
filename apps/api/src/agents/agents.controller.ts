import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { ChatDto } from './dto/chat.dto';

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('agents')
export class AgentsController {
  constructor(private readonly agentsService: AgentsService) {}

  @Get()
  list() {
    return this.agentsService.listAgents();
  }

  @Post(':key/chat')
  chat(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Body() dto: ChatDto) {
    return this.agentsService.chat(user.organizationId, key, dto);
  }
}
