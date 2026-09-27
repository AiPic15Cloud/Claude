import { ExecutionContext, ForbiddenException } from '@nestjs/common';
import { DetteScopeGuard } from './dette-scope.guard';
import type { AuthenticatedUser } from '../decorators/current-user.decorator';

function contextWithUser(user: AuthenticatedUser | undefined): ExecutionContext {
  return {
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const fullUser: AuthenticatedUser = { id: 'u1', email: 'nicolas@atlas.demo', role: 'ADMIN', organizationId: 'org1', workspaceScope: 'FULL' };
const restrictedUser: AuthenticatedUser = { id: 'u2', email: 'associe@atlas.demo', role: 'ANALYST', organizationId: 'org1', workspaceScope: 'FRACTIONAL_ONLY' };

describe('DetteScopeGuard (spec ATLAS v2 §2/D02 — espaces étanches, stopgap)', () => {
  const guard = new DetteScopeGuard();

  it('autorise un compte workspaceScope FULL', () => {
    expect(guard.canActivate(contextWithUser(fullUser))).toBe(true);
  });

  it('bloque un compte FRACTIONAL_ONLY avec une ForbiddenException, jamais un simple filtrage silencieux', () => {
    expect(() => guard.canActivate(contextWithUser(restrictedUser))).toThrow(ForbiddenException);
  });

  it('bloque par défaut si request.user est absent (jamais un accès par défaut en cas de contexte inattendu)', () => {
    expect(() => guard.canActivate(contextWithUser(undefined))).toThrow(ForbiddenException);
  });
});
