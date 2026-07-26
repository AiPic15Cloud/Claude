import { Body, Controller, Get, Put, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { FeesService } from './fees.service';
import { SetFeesTargetDto } from './dto/set-fees-target.dto';

@ApiTags('fees')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('fees')
export class FeesController {
  constructor(private readonly feesService: FeesService) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthenticatedUser, @Query('year') year?: string) {
    const y = year ? parseInt(year, 10) : new Date().getFullYear();
    return this.feesService.summary(user.organizationId, y);
  }

  @Put('target')
  setTarget(@CurrentUser() user: AuthenticatedUser, @Body() dto: SetFeesTargetDto) {
    return this.feesService.setTarget(user.organizationId, dto.year, dto.targetAmount);
  }
}
