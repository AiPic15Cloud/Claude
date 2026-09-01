import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

const SALT_ROUNDS = 12;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  findById(id: string) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  create(data: {
    email: string;
    passwordHash: string;
    firstName: string;
    lastName: string;
    organizationId: string;
    role?: Role;
  }) {
    return this.prisma.user.create({ data });
  }

  listByOrganization(organizationId: string) {
    return this.prisma.user.findMany({
      where: { organizationId },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        role: true,
        avatarUrl: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
    });
    return this.sanitize(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  }

  private sanitize(user: { passwordHash: string; twoFactorSecret?: string | null; twoFactorRecoveryCodes?: string[]; [key: string]: unknown }) {
    const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, twoFactorRecoveryCodes: _twoFactorRecoveryCodes, ...rest } = user;
    return rest;
  }
}
