import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { ChatDto } from './dto/chat.dto';
import { ChatWithFileDto } from './dto/chat-with-file.dto';

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

  @Post(':key/chat-with-file')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  chatWithFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: ChatWithFileDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');

    let history: { role: 'user' | 'assistant'; content: string }[] = [];
    if (dto.history) {
      try {
        const parsed = JSON.parse(dto.history);
        if (Array.isArray(parsed)) {
          history = parsed
            .filter((m) => m && typeof m.content === 'string')
            .map((m) => ({ role: m.role === 'assistant' ? 'assistant' : 'user', content: m.content }));
        }
      } catch {
        throw new BadRequestException('Historique de conversation invalide');
      }
    }

    return this.agentsService.chatWithFile(
      user.organizationId,
      key,
      { history, message: dto.message, dealId: dto.dealId },
      { buffer: file.buffer, mimeType: file.mimetype, name: file.originalname },
    );
  }
}

@ApiTags('agents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/documents/:documentId/extract-financials')
export class FinancialExtractionController {
  constructor(private readonly agentsService: AgentsService) {}

  @Post()
  extract(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.agentsService.extractFinancials(user.organizationId, dealId, documentId);
  }
}
