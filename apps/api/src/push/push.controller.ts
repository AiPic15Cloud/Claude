import { Body, Controller, Delete, Get, HttpCode, HttpStatus, Post, UseGuards } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser, AuthenticatedUser } from '../common/decorators/current-user.decorator';
import { PushService } from './push.service';
import { SubscribePushDto } from './dto/subscribe-push.dto';

@ApiTags('push')
@Controller('push')
export class PushController {
  constructor(private readonly push: PushService) {}

  // Not auth-guarded: the public key isn't sensitive (it's sent to the
  // browser's push service on every subscribe by design) and the frontend
  // needs it before a session may exist yet.
  @Get('vapid-public-key')
  getVapidPublicKey() {
    return { publicKey: this.push.getVapidPublicKey() };
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Post('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  subscribe(@CurrentUser() user: AuthenticatedUser, @Body() dto: SubscribePushDto) {
    return this.push.subscribe(user.id, { endpoint: dto.endpoint, keys: dto.keys }, dto.userAgent);
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @Delete('subscribe')
  @HttpCode(HttpStatus.NO_CONTENT)
  unsubscribe(@CurrentUser() user: AuthenticatedUser, @Body('endpoint') endpoint: string) {
    return this.push.unsubscribe(user.id, endpoint);
  }
}
