import { BadRequestException, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { generateSecret, generateURI, verify } from 'otplib';
import * as QRCode from 'qrcode';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import Redis from 'ioredis';
import { PrismaService } from '../common/prisma/prisma.service';
import { decryptTotpSecret, encryptTotpSecret } from './totp-secret-encryption.util';

const SALT_ROUNDS = 12;
const RECOVERY_CODE_COUNT = 8;
const ISSUER = 'ATLAS';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);

  // Per-user failed-attempt counter, independent of source IP — the global
  // per-IP throttle on POST /2fa/verify doesn't stop a distributed attacker
  // rotating IPs from brute-forcing one account's TOTP/recovery code.
  // Backed by Redis — the same REDIS_URL/ioredis already provisioned for
  // crowdfunding-watch's BullMQ queues (see crowdfunding-watch.module.ts) —
  // rather than an in-memory Map, so the lockout survives horizontal
  // scaling: with a per-process Map, an attacker simply gets load-balanced
  // across replicas to reset their attempt count. Unlike the detection
  // queues (which crash loudly without Redis, see configuration.ts), a
  // Redis hiccup here fails OPEN — logged, lockout temporarily unenforced —
  // rather than breaking login for every 2FA-enabled user; the underlying
  // TOTP/recovery-code check still runs regardless.
  private readonly redis: Redis;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.redis = new Redis(this.config.get<string>('redis.url')!);
    this.redis.on('error', (err) => this.logger.warn(`Redis (2FA lockout) connection error: ${err.message}`));
  }

  private get encryptionKey(): string {
    return this.config.get<string>('security.twoFactorEncryptionKey')!;
  }

  private lockKey(userId: string): string {
    return `2fa:lockout:${userId}`;
  }

  private failKey(userId: string): string {
    return `2fa:failcount:${userId}`;
  }

  private async assertNotLocked(userId: string): Promise<void> {
    try {
      const lockedUntil = await this.redis.get(this.lockKey(userId));
      if (lockedUntil && Number(lockedUntil) > Date.now()) {
        const remainingMin = Math.ceil((Number(lockedUntil) - Date.now()) / 60_000);
        throw new UnauthorizedException(
          `Trop de tentatives échouées — réessayez dans ${remainingMin} min`,
        );
      }
    } catch (err) {
      if (err instanceof UnauthorizedException) throw err;
      this.logger.warn(`2FA lockout check failed, failing open: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async registerFailure(userId: string): Promise<void> {
    try {
      const count = await this.redis.incr(this.failKey(userId));
      if (count === 1) {
        await this.redis.pexpire(this.failKey(userId), LOCKOUT_MS);
      }
      if (count >= MAX_FAILED_ATTEMPTS) {
        await this.redis.set(this.lockKey(userId), String(Date.now() + LOCKOUT_MS), 'PX', LOCKOUT_MS);
        await this.redis.del(this.failKey(userId));
      }
    } catch (err) {
      this.logger.warn(`2FA failure counter update failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  private async registerSuccess(userId: string): Promise<void> {
    try {
      await this.redis.del(this.failKey(userId), this.lockKey(userId));
    } catch (err) {
      this.logger.warn(`2FA lockout reset failed: ${err instanceof Error ? err.message : err}`);
    }
  }

  async generateSetup(userId: string, email: string) {
    const existing = await this.prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } });
    if (existing?.twoFactorEnabled) {
      throw new BadRequestException('La double authentification est déjà activée — désactivez-la avant de la reconfigurer');
    }

    const secret = generateSecret();
    await this.prisma.user.update({ where: { id: userId }, data: { twoFactorSecret: encryptTotpSecret(secret, this.encryptionKey) } });

    const otpauthUrl = generateURI({ issuer: ISSUER, label: email, secret });
    const qrCodeDataUrl = await QRCode.toDataURL(otpauthUrl);
    return { secret, otpauthUrl, qrCodeDataUrl };
  }

  async enable(userId: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) {
      throw new BadRequestException('Aucune configuration 2FA en attente — relancez la mise en place');
    }

    // Routed through verifyCode() rather than calling verify() directly so
    // this step shares the exact same assertNotLocked/registerFailure
    // lockout as every other TOTP verification path — the secret is already
    // persisted (unconfirmed) at this point, so verifyCode() can check it.
    const valid = await this.verifyCode(userId, code);
    if (!valid) {
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

    // Désactiver le 2FA affaiblit toute session existante (un refresh token
    // volé n'a plus besoin du second facteur) — révoquer les refresh tokens
    // en cours force une reconnexion complète après ce changement.
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }

  async verifyCode(userId: string, code: string): Promise<boolean> {
    await this.assertNotLocked(userId);

    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.twoFactorSecret) return false;

    const { secret, wasLegacyPlaintext } = decryptTotpSecret(user.twoFactorSecret, this.encryptionKey);
    // Migration transparente : un secret encore en clair (posé avant ce
    // correctif) est chiffré dès son premier usage, sans script ni
    // interruption de service — jamais de lockout pour l'utilisateur.
    if (wasLegacyPlaintext) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { twoFactorSecret: encryptTotpSecret(secret, this.encryptionKey) },
      });
    }

    if (/^\d{6}$/.test(code)) {
      const result = await verify({ token: code, secret }).catch(() => ({ valid: false }));
      if (result.valid) {
        await this.registerSuccess(userId);
        return true;
      }
    }

    for (const hash of user.twoFactorRecoveryCodes) {
      if (await bcrypt.compare(code, hash)) {
        await this.prisma.user.update({
          where: { id: userId },
          data: { twoFactorRecoveryCodes: user.twoFactorRecoveryCodes.filter((h) => h !== hash) },
        });
        await this.registerSuccess(userId);
        return true;
      }
    }

    await this.registerFailure(userId);
    return false;
  }

  private generateRecoveryCode(): string {
    return crypto.randomBytes(5).toString('hex');
  }
}
