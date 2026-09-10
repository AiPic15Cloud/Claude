import { BadRequestException, Injectable, UnauthorizedException } from '@nestjs/common';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { PrismaService } from '../common/prisma/prisma.service';

const SALT_ROUNDS = 12;
const RECOVERY_CODE_COUNT = 8;
const ISSUER = 'ATLAS';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class TwoFactorService {
  // Per-user failed-attempt counter, independent of source IP — the global
  // per-IP throttle on POST /2fa/verify doesn't stop a distributed attacker
  // rotating IPs from brute-forcing one account's TOTP/recovery code.
  // In-memory only (single API replica); resets on deploy/restart.
  private readonly failedAttempts = new Map<string, { count: number; lockedUntil?: number }>();

  constructor(private readonly prisma: PrismaService) {}

  private assertNotLocked(userId: string) {
    const entry = this.failedAttempts.get(userId);
    if (entry?.lockedUntil && entry.lockedUntil > Date.now()) {
      const remainingMin = Math.ceil((entry.lockedUntil - Date.now()) / 60_000);
      throw new UnauthorizedException(
        `Trop de tentatives échouées — réessayez dans ${remainingMin} min`,
      );
    }
  }

  private registerFailure(userId: string) {
    const entry = this.failedAttempts.get(userId) ?? { count: 0 };
    entry.count += 1;
    if (entry.count >= MAX_FAILED_ATTEMPTS) {
      entry.lockedUntil = Date.now() + LOCKOUT_MS;
      entry.count = 0;
    }
    this.failedAttempts.set(userId, entry);
  }

  private registerSuccess(userId: string) {
    this.failedAttempts.delete(userId);
  }

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
    this.assertNotLocked(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return false;

    if (/^\d{6}$/.test(code)) {
      const result = await verify({ token: code, secret: user.twoFactorSecret }).catch(() => ({ valid: false }));
      if (result.valid) {
        this.registerSuccess(userId);
        return true;
      }
    }

    for (const hash of user.twoFactorRecoveryCodes) {
      if (await bcrypt.compare(code, hash)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== hash) },
        });
        this.registerSuccess(userId);
        return true;
      }
    }

    this.registerFailure(userId);
    return false;
  }

  private generateRecoveryCode(): string {
    return crypto.randomBytes(5).toString('hex');
  }
}
