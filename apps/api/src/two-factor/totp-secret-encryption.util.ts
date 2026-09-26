import * as crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'v1:';
const IV_LENGTH = 12;

/**
 * Chiffre le secret TOTP avant stockage — un dump de base ne doit jamais
 * suffire à recalculer les codes 2FA de tous les comptes (contrairement aux
 * codes de secours, déjà hashés par bcrypt). AES-256-GCM avec un IV aléatoire
 * par valeur ; la clé vient de `security.twoFactorEncryptionKey`, jamais du
 * secret de signature JWT.
 */
export function encryptTotpSecret(plainSecret: string, keyBase64: string): string {
  const key = resolveKey(keyBase64);
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
  const ciphertext = Buffer.concat([cipher.update(plainSecret, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString('base64')}:${authTag.toString('base64')}:${ciphertext.toString('base64')}`;
}

/**
 * Déchiffre un secret stocké au nouveau format (`v1:...`). Une valeur sans
 * ce préfixe est un secret legacy en clair (avant ce correctif) — renvoyée
 * telle quelle, à charge de l'appelant de la ré-encrypter dans la foulée
 * (migration transparente au premier usage, sans script ni interruption).
 */
export function decryptTotpSecret(stored: string, keyBase64: string): { secret: string; wasLegacyPlaintext: boolean } {
  if (!stored.startsWith(PREFIX)) {
    return { secret: stored, wasLegacyPlaintext: true };
  }
  const key = resolveKey(keyBase64);
  const [ivB64, authTagB64, ciphertextB64] = stored.slice(PREFIX.length).split(':');
  if (!ivB64 || !authTagB64 || !ciphertextB64) {
    throw new Error('Secret 2FA stocké dans un format inattendu.');
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(authTagB64, 'base64'));
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextB64, 'base64')), decipher.final()]);
  return { secret: plaintext.toString('utf8'), wasLegacyPlaintext: false };
}

function resolveKey(keyBase64: string): Buffer {
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new Error('TWO_FACTOR_ENCRYPTION_KEY doit décoder en exactement 32 octets (base64 de 32 octets aléatoires).');
  }
  return key;
}
