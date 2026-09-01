import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { ROLES_KEY } from '../decorators/roles.decorator';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

/**
 * Spec ATLAS v2, A.10 — un rôle VIEWER ne peut jamais valider une action
 * ou un statut proposé par le système (compléter/annuler une tâche,
 * vérifier une garantie, poser un override analyste...). Doit toujours
 * s'utiliser après JwtAuthGuard : lit `request.user` déjà authentifié.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!requiredRoles || requiredRoles.length === 0) return true;

    const request = context.switchToHttp().getRequest<{ user?: AuthenticatedUser }>();
    const user = request.user;
    if (!user || !requiredRoles.includes(user.role as Role)) {
      throw new ForbiddenException('Cette action est réservée aux analystes et administrateurs.');
    }
    return true;
  }
}
