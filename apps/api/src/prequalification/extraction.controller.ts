import { Controller, Param, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { DetteScopeGuard } from '../common/guards/dette-scope.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { ExtractionService } from './extraction.service';

@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard, DetteScopeGuard)
@Roles('ADMIN', 'ANALYST')
@Controller('prequalification/cases/:caseId/documents/:documentId/extract')
export class ExtractionController {
  constructor(private readonly service: ExtractionService) {}

  @Post()
  extract(@CurrentUser() user: AuthenticatedUser, @Param('caseId') caseId: string, @Param('documentId') documentId: string) {
    return this.service.extract(user.organizationId, caseId, documentId);
  }
}
