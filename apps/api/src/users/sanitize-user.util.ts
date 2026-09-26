type SanitizableUser = {
  passwordHash: string;
  twoFactorSecret?: string | null;
  twoFactorRecoveryCodes?: string[];
  [key: string]: unknown;
};

/** Strips fields that must never leave the server (password hash, 2FA secret/recovery codes) from a user record before it's returned in an API response. */
export function sanitizeUser<T extends SanitizableUser>(
  user: T,
): Omit<T, 'passwordHash' | 'twoFactorSecret' | 'twoFactorRecoveryCodes'> {
  const { passwordHash: _passwordHash, twoFactorSecret: _twoFactorSecret, twoFactorRecoveryCodes: _twoFactorRecoveryCodes, ...rest } = user;
  return rest;
}
