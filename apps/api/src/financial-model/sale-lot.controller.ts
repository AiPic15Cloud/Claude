import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { SaleLotService } from './sale-lot.service';
import { CreateSaleLotDto, UpdateSaleLotDto } from './dto/sale-lot.dto';

@ApiTags('sale-lots')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deals/:dealId/sale-lots')
export class SaleLotController {
  constructor(private readonly saleLotService: SaleLotService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string) {
    return this.saleLotService.list(user.organizationId, dealId);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Body() dto: CreateSaleLotDto) {
    return this.saleLotService.create(user.organizationId, dealId, user.id, dto);
  }

  @Patch(':lotId')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('dealId') dealId: string,
    @Param('lotId') lotId: string,
    @Body() dto: UpdateSaleLotDto,
  ) {
    return this.saleLotService.update(user.organizationId, dealId, lotId, user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Delete(':lotId')
  remove(@CurrentUser() user: AuthenticatedUser, @Param('dealId') dealId: string, @Param('lotId') lotId: string) {
    return this.saleLotService.remove(user.organizationId, dealId, lotId, user.id);
  }
}
