import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import type { ActionItemStatus } from '@prisma/client';
import { ActionItemsService } from './action-items.service';
import { CreateActionItemDto } from './dto/create-action-item.dto';
import { ResolveActionItemDto } from './dto/resolve-action-item.dto';
import { ReassignActionItemDto } from './dto/reassign-action-item.dto';
import { DeferActionItemDto } from './dto/defer-action-item.dto';

@ApiTags('action-items')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('action-items')
export class ActionItemsController {
  constructor(private readonly service: ActionItemsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query('status') status?: ActionItemStatus, @Query('ownerId') ownerId?: string, @Query('openOnly') openOnly?: string) {
    return this.service.list(user, { status, ownerId, openOnly: openOnly === 'true' });
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  create(@Body() dto: CreateActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.create(dto, user);
  }

  @Patch(':id/resolve')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  resolve(@Param('id') id: string, @Body() dto: ResolveActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.resolve(id, dto, user);
  }

  @Patch(':id/reassign')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  reassign(@Param('id') id: string, @Body() dto: ReassignActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.reassign(id, dto, user);
  }

  @Patch(':id/defer')
  @UseGuards(RolesGuard)
  @Roles('ADMIN', 'ANALYST')
  defer(@Param('id') id: string, @Body() dto: DeferActionItemDto, @CurrentUser() user: AuthenticatedUser) {
    return this.service.defer(id, dto, user);
  }
}
