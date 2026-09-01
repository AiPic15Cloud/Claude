import { Body, Controller, Get, HttpCode, HttpStatus, Patch, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { UsersService } from './users.service';
import { TwoFactorService } from '../two-factor/two-factor.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { TwoFactorEnableDto } from './dto/two-factor-enable.dto';
import { TwoFactorDisableDto } from './dto/two-factor-disable.dto';

@ApiTags('users')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly twoFactorService: TwoFactorService,
  ) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser) {
    return this.usersService.listByOrganization(user.organizationId);
  }

  @Patch('me')
  updateProfile(@CurrentUser() user: AuthenticatedUser, @Body() dto: UpdateProfileDto) {
    return this.usersService.updateProfile(user.id, dto);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Patch('me/password')
  changePassword(@CurrentUser() user: AuthenticatedUser, @Body() dto: ChangePasswordDto) {
    return this.usersService.changePassword(user.id, dto);
  }

  @Post('me/2fa/setup')
  setupTwoFactor(@CurrentUser() user: AuthenticatedUser) {
    return this.twoFactorService.generateSetup(user.id, user.email);
  }

  @Post('me/2fa/enable')
  enableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorEnableDto) {
    return this.twoFactorService.enable(user.id, dto.code);
  }

  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('me/2fa/disable')
  disableTwoFactor(@CurrentUser() user: AuthenticatedUser, @Body() dto: TwoFactorDisableDto) {
    return this.twoFactorService.disable(user.id, dto.password);
  }
}
