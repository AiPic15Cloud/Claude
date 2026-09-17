import { BadRequestException, Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Res, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrequalDocumentsService } from './documents.service';
import { DOCUMENT_MIME_ALLOWLIST, mimeAllowlistFilter } from '../common/storage/file-validation.util';
import { UpdateDocumentDto } from './dto/update-document.dto';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases/:caseId/documents')
export class PrequalDocumentsController {
  constructor(private readonly service: PrequalDocumentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string) {
    return this.service.list(user.organizationId, caseId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: 25 * 1024 * 1024 },
      fileFilter: mimeAllowlistFilter(DOCUMENT_MIME_ALLOWLIST),
    }),
  )
  upload(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string, @UploadedFile() file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Aucun fichier reçu');
    return this.service.upload(user.organizationId, caseId, user.id, file);
  }

  @Patch(':documentId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  update(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string, @Param('documentId') documentId: string, @Body() dto: UpdateDocumentDto) {
    return this.service.update(user.organizationId, caseId, documentId, dto);
  }

  @Get(':documentId/url')
  getUrl(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string, @Param('documentId') documentId: string) {
    return this.service.getDownloadUrl(user.organizationId, caseId, documentId);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':documentId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string, @Param('documentId') documentId: string) {
    return this.service.remove(user.organizationId, caseId, documentId);
  }
}

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/documents/local')
export class PrequalLocalDocumentsController {
  constructor(private readonly service: PrequalDocumentsService) {}

  @Get(':key')
  async serve(@CurrentUser() user: AuthenticatedUser, @Param('key') key: string, @Res() res: Response) {
    const buffer = await this.service.readLocalFile(user.organizationId, decodeURIComponent(key));
    res.send(buffer);
  }
}
