import { ConflictException, ForbiddenException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../common/prisma/prisma.service';
import { Role, WorkspaceScope } from '@prisma/client';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { CreateTeamMemberDto } from './dto/create-team-member.dto';
import { UpdateTeamMemberAccessDto } from './dto/update-team-member-access.dto';
import { sanitizeUser } from './sanitize-user.util';

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
    /** Spec ATLAS v2 §2/D02 — FRACTIONAL_ONLY pour tout compte hors Nicolas tant que le vrai modèle d'espaces (Lot B) n'est pas livré. */
    workspaceScope?: WorkspaceScope;
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
        workspaceScope: true,
        avatarUrl: true,
      },
      orderBy: { firstName: 'asc' },
    });
  }

  /** Créé par un ADMIN pour un collègue (Équipe) — même commande que `register()` mais rattachée à l'organisation existante au lieu d'en créer une nouvelle, avec rôle et périmètre choisis explicitement plutôt que le défaut ADMIN/FULL du self-signup. */
  async createTeamMember(organizationId: string, dto: CreateTeamMemberDto) {
    const existing = await this.findByEmail(dto.email);
    if (existing) throw new ConflictException('Un compte existe déjà avec cet email');

    const passwordHash = await bcrypt.hash(dto.password, SALT_ROUNDS);
    const user = await this.create({
      email: dto.email,
      passwordHash,
      firstName: dto.firstName,
      lastName: dto.lastName,
      organizationId,
      role: dto.role,
      workspaceScope: dto.workspaceScope,
    });
    return sanitizeUser(user);
  }

  /**
   * Changer le rôle et le périmètre (espace étanche) d'un collègue — jamais
   * les siens via cette route (un ADMIN qui se retire ses propres droits
   * pourrait se verrouiller hors de la gestion d'équipe ; le profil personnel
   * reste `/users/me`, pas ici). Scopé à l'organisation de l'appelant.
   */
  async updateAccess(organizationId: string, targetUserId: string, currentUserId: string, dto: UpdateTeamMemberAccessDto) {
    if (targetUserId === currentUserId) {
      throw new ForbiddenException('Modifiez votre propre profil depuis "Profil", pas depuis la gestion d\'équipe.');
    }
    const target = await this.prisma.user.findFirst({ where: { id: targetUserId, organizationId } });
    if (!target) throw new NotFoundException('Profil introuvable.');

    const user = await this.prisma.user.update({
      where: { id: targetUserId },
      data: { role: dto.role, workspaceScope: dto.workspaceScope },
    });
    return sanitizeUser(user);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.update({
      where: { id: userId },
      data: { firstName: dto.firstName, lastName: dto.lastName },
    });
    return sanitizeUser(user);
  }

  async changePassword(userId: string, dto: ChangePasswordDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const valid = await bcrypt.compare(dto.currentPassword, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Mot de passe actuel incorrect');

    const passwordHash = await bcrypt.hash(dto.newPassword, SALT_ROUNDS);
    await this.prisma.user.update({ where: { id: userId }, data: { passwordHash } });

    // Un refresh token volé avant ce changement resterait sinon valable
    // indéfiniment (rotation à chaque refresh, jamais d'expiration liée au
    // mot de passe) — changer le mot de passe doit déconnecter toute autre
    // session, pas seulement bloquer les futures connexions par mot de passe.
    await this.prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  }
}
