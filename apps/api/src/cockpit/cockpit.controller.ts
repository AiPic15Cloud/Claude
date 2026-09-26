import { Controller, Get, Res, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import type { Response } from 'express';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { CockpitService } from './cockpit.service';
import { PdfRenderService } from '../pdf-export/pdf-render.service';
import { buildPortfolioReportHtml } from './portfolio-report-pdf.util';

@ApiTags('cockpit')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cockpit')
export class CockpitController {
  constructor(
    private readonly cockpitService: CockpitService,
    private readonly pdfRender: PdfRenderService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.cockpitService.summary(user.organizationId, user.id);
  }

  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Get('report')
  exportReport(@CurrentUser() user: AuthenticatedUser) {
    return this.cockpitService.exportPortfolioReport(user.organizationId);
  }

  /**
   * Rapport portefeuille en PDF, généré côté serveur (même pattern que les
   * autres exports — window.print() ne fonctionne quasiment pas sur Chrome
   * Android). Réutilise le même agrégat que `exportReport` ci-dessus.
   */
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  @Get('report-pdf')
  async exportReportPdf(@CurrentUser() user: AuthenticatedUser, @Res() res: Response) {
    const report = await this.cockpitService.exportPortfolioReport(user.organizationId);
    const html = buildPortfolioReportHtml(report.kpis, report.overdueTasks);
    const pdf = await this.pdfRender.renderHtmlToPdf(html);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="rapport-portefeuille.pdf"');
    res.send(pdf);
  }
}
