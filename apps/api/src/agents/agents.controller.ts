import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { AgentsService } from './agents.service';
import { ChatDto } from './dto/chat.dto';
import { ChatWithFileDto } from './dto/chat-with-file.dto';

// Newline-delimited JSON: one {"delta": "..."} object per text chunk, a
// trailing {"done": true}, or {"error": "..."} if generation fails midway
// (validation errors happen before this runs — see AgentsService.prepareChat
// — and go through Nest's normal exception filters with a proper status).
async function streamDeltas(res: Response, deltas: AsyncGenerator<string>): Promise<void> {
  res.setHeader('Content-Type', 'application/x-ndjson; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache');
  try {
    for await (const delta of deltas) {
      res.write(JSON.stringify({ delta }) + '\n');
    }
    res.write(JSON.stringify({ done: true }) + '\n');
  } catch (err) {
    res.write(JSON.stringify({ error: err instanceof Error ? err.message : 'Erreur pendant la génération.' }) + '\n');
  } finally {
    res.end();
  }
}

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
  async chat(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Body() dto: ChatDto, @Res() res: Response) {
    const { system, messages } = await this.agentsService.prepareChat(user.organizationId, key, dto);
    await streamDeltas(res, this.agentsService.streamText(system, messages));
  }

  @Post(':key/chat-with-file')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  async chatWithFile(
    @CurrentUser() user: AuthenticatedUser,
    @Param('key') key: string,
    @Body() dto: ChatWithFileDto,
    @Res() res: Response,
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

    const { system, messages } = await this.agentsService.prepareChatWithFile(
      user.organizationId,
      key,
      { history, message: dto.message, dealId: dto.dealId },
      { buffer: file.buffer, mimeType: file.mimetype, name: file.originalname },
    );
    await streamDeltas(res, this.agentsService.streamText(system, messages));
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
