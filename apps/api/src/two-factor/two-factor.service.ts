import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

const SALT_ROUNDS = 12;
const RECOVERY_CODE_COUNT = 8;
const ISSUER = 'ATLAS';

@Injectable()
export class TwoFactorService {
  constructor(private readonly prisma: PrismaService) {}

  async generateSetup(userId: string, email: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    if (existing?.twoFactorEnabled) {
      throw new BadRequestException('La double authentification est déjà activée — désactivez-la avant de la reconfigurer');
    }

    const secret = generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: secret } });

    const otpauthUrl = generateURI({ issuer: ISSUER, label: email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Aucune configuration 2FA en attente — relancez la mise en place');
    }
    const result = await verify({ token: code, secret: user.twoFactorSecret }).catch(() => ({ valid: false }));
    if (!result.valid) {
      throw new UnauthorizedException('Code invalide');
    }

    const recoveryCodes = Array.from({ length: RECOVERY_CODE_COUNT }, () => this.generateRecoveryCode());
    const hashedCodes = await Promise.all(recoveryCodes.map((c) => bcrypt.hash(c, SALT_ROUNDS)));

    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashedCodes },
    });

    return { recoveryCodes };
  }

  async disable(userId: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    if (!(await bcrypt.compare(password, user.passwordHash))) {
      throw new UnauthorizedException('Mot de passe incorrect');
    }
    await this.prisma.user.update({
      where: { id: userId },
      data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
    });
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return false;

    if (/^\d{6}$/.test(code)) {
      const result = await verify({ token: code, secret: user.twoFactorSecret }).catch(() => ({ valid: false }));
      if (result.valid) return true;
    }

    for (const hash of user.twoFactorRecoveryCodes) {
      if (await bcrypt.compare(code, hash)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== hash) },
        });
        return true;
      }
    }
    return false;
  }

  private generateRecoveryCode(): string {
    return crypto.randomBytes(5).toString('hex');
  }
}
