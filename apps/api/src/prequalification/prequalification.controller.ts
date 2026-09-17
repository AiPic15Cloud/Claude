import { Body, Controller, Delete, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PrequalificationService } from './prequalification.service';
import { CreateCaseDto } from './dto/create-case.dto';
import { UpdateCaseDto } from './dto/update-case.dto';
import { UpsertProjectProfileDto } from './dto/upsert-project-profile.dto';
import { UpsertFinancialModelDto } from './dto/upsert-financial-model.dto';
import { UpsertPersonDto } from './dto/upsert-person.dto';
import { UpsertCompanyDto } from './dto/upsert-company.dto';
import { UpsertLotDto } from './dto/upsert-lot.dto';
import { UpsertTimelineDto } from './dto/upsert-timeline.dto';
import { CreateFindingDto } from './dto/create-finding.dto';
import { ReviewFindingDto } from './dto/review-finding.dto';
import { CreateDecisiveQuestionDto, AnswerDecisiveQuestionDto } from './dto/create-decisive-question.dto';
import { CreateDocumentRequestDto, UpdateDocumentRequestDto } from './dto/create-document-request.dto';

/**
 * Routes d'écriture réservées à ADMIN/ANALYST — décision utilisateur
 * explicite (pas de rôle RISK_MANAGER dans ATLAS), même convention que le
 * reste du dépôt (IC Engine, DealsController).
 */
@ApiTags('prequalification')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('prequalification/cases')
export class PrequalificationController {
  constructor(private readonly service: PrequalificationService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: string, @Query('assignedAnalystId') assignedAnalystId?: string) {
    return this.service.list(user.organizationId, { status, assignedAnalystId });
  }

  @Get(':id')
  getById(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getById(user.organizationId, id);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  create(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateCaseDto) {
    return this.service.create(user.organizationId, user.id, dto);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  update(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpdateCaseDto) {
    return this.service.update(user.organizationId, id, dto);
  }

  @Patch(':id/project')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertProjectProfile(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertProjectProfileDto) {
    return this.service.upsertProjectProfile(user.organizationId, id, dto);
  }

  @Patch(':id/financial')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertFinancialModel(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertFinancialModelDto) {
    return this.service.upsertFinancialModel(user.organizationId, id, dto);
  }

  @Get(':id/financial/bp-comparison')
  getBpComparison(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getBpComparison(user.organizationId, id);
  }

  @Post(':id/financial/lock-baseline')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  lockBaseline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string) {
    return this.service.lockBaseline(user.organizationId, id, user.id);
  }

  @Patch(':id/timeline')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  upsertTimeline(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertTimelineDto) {
    return this.service.upsertTimeline(user.organizationId, id, dto);
  }

  // ── Porteurs ──

  @Post(':id/people')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createPerson(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertPersonDto) {
    return this.service.createPerson(user.organizationId, id, dto);
  }

  @Patch(':id/people/:personId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  updatePerson(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('personId') personId: string, @Body() dto: UpsertPersonDto) {
    return this.service.updatePerson(user.organizationId, id, personId, dto);
  }

  @Delete(':id/people/:personId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  deletePerson(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('personId') personId: string) {
    return this.service.deletePerson(user.organizationId, id, personId);
  }

  // ── Sociétés ──

  @Post(':id/companies')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createCompany(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertCompanyDto) {
    return this.service.createCompany(user.organizationId, id, dto);
  }

  @Patch(':id/companies/:companyId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  updateCompany(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('companyId') companyId: string, @Body() dto: UpsertCompanyDto) {
    return this.service.updateCompany(user.organizationId, id, companyId, dto);
  }

  @Delete(':id/companies/:companyId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  deleteCompany(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('companyId') companyId: string) {
    return this.service.deleteCompany(user.organizationId, id, companyId);
  }

  // ── Lots ──

  @Post(':id/lots')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createLot(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: UpsertLotDto) {
    return this.service.createLot(user.organizationId, id, dto);
  }

  @Patch(':id/lots/:lotId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  updateLot(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('lotId') lotId: string, @Body() dto: UpsertLotDto) {
    return this.service.updateLot(user.organizationId, id, lotId, dto);
  }

  @Delete(':id/lots/:lotId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  deleteLot(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('lotId') lotId: string) {
    return this.service.deleteLot(user.organizationId, id, lotId);
  }

  // ── Findings ──

  @Post(':id/findings')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createFinding(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateFindingDto) {
    return this.service.createFinding(user.organizationId, id, dto);
  }

  @Patch(':id/findings/:findingId/review')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  reviewFinding(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('findingId') findingId: string, @Body() dto: ReviewFindingDto) {
    return this.service.reviewFinding(user.organizationId, id, findingId, user.id, dto);
  }

  // ── Questions décisives ──

  @Post(':id/questions')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createDecisiveQuestion(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateDecisiveQuestionDto) {
    return this.service.createDecisiveQuestion(user.organizationId, id, dto);
  }

  @Patch(':id/questions/:questionId/answer')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  answerDecisiveQuestion(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('questionId') questionId: string, @Body() dto: AnswerDecisiveQuestionDto) {
    return this.service.answerDecisiveQuestion(user.organizationId, id, questionId, dto);
  }

  // ── Demandes de documents ──

  @Post(':id/document-requests')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createDocumentRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Body() dto: CreateDocumentRequestDto) {
    return this.service.createDocumentRequest(user.organizationId, id, dto);
  }

  @Patch(':id/document-requests/:requestId')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  updateDocumentRequest(@CurrentUser() user: AuthenticatedUser, @Param('id') id: string, @Param('requestId') requestId: string, @Body() dto: UpdateDocumentRequestDto) {
    return this.service.updateDocumentRequest(user.organizationId, id, requestId, dto);
  }
}
