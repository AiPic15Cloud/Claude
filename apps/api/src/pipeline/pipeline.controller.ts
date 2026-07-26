import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PipelineService } from './pipeline.service';
import { CreatePipelineEntryDto } from './dto/create-pipeline-entry.dto';
import { UpdatePipelineEntryDto } from './dto/update-pipeline-entry.dto';
import { QueryPipelineDto } from './dto/query-pipeline.dto';

@ApiTags('pipeline')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('pipeline')
export class PipelineController {
  constructor(private readonly pipelineService: PipelineService) {}

  @Get()
  findAll(@CurrentUser() user: AuthenticatedUser, @Query() query: QueryPipelineDto) {
    return this.pipelineService.findAll(user.organizationId, query);
  }

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.pipelineService.summary(user.organizationId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreatePipelineEntryDto) {
    return this.pipelineService.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdatePipelineEntryDto) {
    return this.pipelineService.update(user.organizationId, id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':id')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.pipelineService.remove(user.organizationId, id);
  }
}
