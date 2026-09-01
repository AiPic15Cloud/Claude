import { SetMetadata } from '@nestjs/common';
import { Role } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Spec ATLAS v2, A.10 — séparation des rôles : proposer (système) vs
 * valider (analyste/comité). Opt-in par route via RolesGuard : une
 * route sans ce décorateur n'est pas affectée.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
