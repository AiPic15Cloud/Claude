import {
  Controller,
  Delete,
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
import { DocumentsService } from './documents.service';

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/documents')
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.documentsService.list(user.organizationId, dealId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 25 * 1024 * 1024 } }))
  upload(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    return this.documentsService.upload(user.organizationId, dealId, user.id, file);
  }

  @Get(':documentId/url')
  getUrl(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.getDownloadUrl(user.organizationId, dealId, documentId);
  }

  @Delete(':documentId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('documentId') documentId: string,
  ) {
    return this.documentsService.remove(user.organizationId, dealId, documentId);
  }
}

@ApiTags('documents')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('documents/local')
export class LocalDocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Get(':key')
  async serve(@Param('key') key: string, @Res() res: Response) {
    const buffer = await this.documentsService.readLocalFile(decodeURIComponent(key));
    res.send(buffer);
  }
}
