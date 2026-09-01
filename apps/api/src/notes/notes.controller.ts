import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UploadedFiles, UseGuards, UseInterceptors } from '@nestjs/common';
import { FilesInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { NotesService } from './notes.service';
import { CreateNoteDto } from './dto/create-note.dto';
import { UpdateNoteDto } from './dto/update-note.dto';

@ApiTags('notes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/notes')
export class NotesController {
  constructor(private readonly notesService: NotesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.notesService.list(user.organizationId, dealId);
  }

  @Post()
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(
    FilesInterceptor('images', 6, {
      limits: { fileSize: 10 * 1024 * 1024 },
      fileFilter: (_req, file, callback) => callback(null, file.mimetype.startsWith('image/')),
    }),
  )
  create(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Body() dto: CreateNoteDto,
    @UploadedFiles() images: Express.Multer.File[] = [],
  ) {
    return this.notesService.create(user.organizationId, dealId, user.id, dto, images);
  }

  @Patch(':noteId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('noteId') noteId: string,
    @Body() dto: UpdateNoteDto,
  ) {
    return this.notesService.update(user.organizationId, dealId, noteId, user.id, user.role, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':noteId')
  remove(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('noteId') noteId: string,
  ) {
    return this.notesService.remove(user.organizationId, dealId, noteId, user.id, user.role);
  }
}
