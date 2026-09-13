import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FitScoringService } from './fit-scoring.service';
import { CreateScoreCategoryDto } from './dto/create-score-category.dto';
import { CreateScoreCriterionDto } from './dto/create-score-criterion.dto';
import { CreateScoreBucketDto } from './dto/create-score-bucket.dto';
import { CreateEliminatoryRuleDto } from './dto/create-eliminatory-rule.dto';
import { SubmitScoreAssessmentDto } from './dto/submit-score-assessment.dto';

@ApiTags('fractional-fit-scoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fractional/fit-scoring')
export class FitScoringController {
  constructor(private readonly service: FitScoringService) {}

  @Get('categories')
  listCategories(@Query('assetType') assetType: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listCategories(user, assetType);
  }

  @Post('categories')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createCategory(@Body() dto: CreateScoreCategoryDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createCategory(dto, user);
  }

  @Delete('categories/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCategory(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeCategory(id, user);
  }

  @Post('criteria')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createCriterion(@Body() dto: CreateScoreCriterionDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createCriterion(dto, user);
  }

  @Delete('criteria/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeCriterion(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeCriterion(id, user);
  }

  @Post('buckets')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createBucket(@Body() dto: CreateScoreBucketDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createBucket(dto, user);
  }

  @Delete('buckets/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeBucket(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeBucket(id, user);
  }

  @Get('eliminatory-rules')
  listEliminatoryRules(@Query('assetType') assetType: string | undefined, @CurrentUser() user: AuthenticatedUser) {
    return this.service.listEliminatoryRules(user, assetType);
  }

  @Post('eliminatory-rules')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  createEliminatoryRule(@Body() dto: CreateEliminatoryRuleDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.createEliminatoryRule(dto, user);
  }

  @Delete('eliminatory-rules/:id')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @HttpCode(HttpStatus.NO_CONTENT)
  removeEliminatoryRule(@Param('id') id: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.removeEliminatoryRule(id, user);
  }

  @Get('projects/:projectId/bareme')
  getBaremeForProject(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getBaremeForProject(projectId, user);
  }

  @Post('projects/:projectId/assessments')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  submitAssessment(@Param('projectId') projectId: string, @Body() dto: SubmitScoreAssessmentDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.computeAndSaveAssessment(projectId, dto, user);
  }

  @Get('projects/:projectId/assessments/latest')
  getLatestAssessment(@Param('projectId') projectId: string, @CurrentUser() user: AuthenticatedUser) {
    return this.service.getLatestAssessment(projectId, user);
  }
}
