// A silently-applied fallback secret here is the same failure either way:
// anyone who reads this (public) source can forge a valid token. These three
// must be real, operator-supplied values — refuse to boot rather than run
// with a forgeable default.
function requireSecret(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}. Refusing to start with an insecure default.`);
  }
  return value;
}

export default () => ({
  port: parseInt(process.env.API_PORT ?? '3001', 10),
  corsOrigin: process.env.API_CORS_ORIGIN ?? 'http://localhost:5173',
  jwt: {
    accessSecret: requireSecret('JWT_ACCESS_SECRET'),
    refreshSecret: requireSecret('JWT_REFRESH_SECRET'),
    // Deliberately distinct from accessSecret: a 2FA challenge token must
    // never verify as a real access token, or it would let anyone who only
    // knows the password skip the second factor entirely by presenting the
    // challenge token as a Bearer token on a normal API call.
    twoFactorSecret: requireSecret('JWT_2FA_SECRET'),
    accessTtl: process.env.JWT_ACCESS_TTL ?? '15m',
    refreshTtl: process.env.JWT_REFRESH_TTL ?? '7d',
  },
  security: {
    // AES-256-GCM key encrypting the TOTP secret at rest (TwoFactorService)
    // — deliberately a separate secret from the JWT ones above: a JWT
    // signing key and an encryption-at-rest key are different security
    // properties, and rotating one should never force rotating the other.
    // 32 raw bytes, base64-encoded (e.g. `openssl rand -base64 32`).
    twoFactorEncryptionKey: requireSecret('TWO_FACTOR_ENCRYPTION_KEY'),
  },
  meilisearch: {
    host: process.env.MEILISEARCH_HOST ?? 'http://localhost:7700',
    apiKey: process.env.MEILISEARCH_API_KEY ?? '',
  },
  ai: {
    anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? '',
    anthropicModel: process.env.ANTHROPIC_MODEL ?? 'claude-sonnet-5',
  },
  // Redis (Railway plugin déjà provisionné) — première utilisation réelle par
  // Veille crowdfunding (spec Lot 1 §7, files BullMQ détection/enrichissement/
  // notification). Pas de garde-fou "dégrade silencieusement" ici : sans
  // REDIS_URL, BullModule échoue franchement au démarrage plutôt que de
  // laisser un worker silencieusement inactif — mieux vaut un crash de
  // déploiement visible qu'une surveillance qui semble tourner sans rien
  // détecter.
  redis: {
    url: process.env.REDIS_URL ?? 'redis://localhost:6379',
  },
  push: {
    // Web Push (VAPID) — degrades the same way as the Anthropic key: no
    // key configured means push sends are silently skipped, not an error.
    vapidPublicKey: process.env.VAPID_PUBLIC_KEY ?? '',
    vapidPrivateKey: process.env.VAPID_PRIVATE_KEY ?? '',
    vapidSubject: process.env.VAPID_SUBJECT ?? '',
  },
  marketData: {
    // Free-tier key from twelvedata.com — powers the CAC 40 ticker. Without
    // it the ticker just omits that item rather than erroring, same
    // degrade-gracefully pattern as the Anthropic key gate.
    twelveDataApiKey: process.env.TWELVE_DATA_API_KEY ?? '',
    // Free-tier key from alphavantage.co — third-choice CAC 40 fallback,
    // behind the keyless Yahoo Finance endpoint (see market-ticker.service.ts).
    // Alpha Vantage's free tier is capped at 25 requests/day, so it's only
    // ever called when Yahoo has already failed — never the primary path.
    alphaVantageApiKey: process.env.ALPHA_VANTAGE_API_KEY ?? '',
  },
  storage: {
    driver: process.env.STORAGE_DRIVER ?? 'local',
    localPath: process.env.STORAGE_LOCAL_PATH ?? './uploads',
    s3: {
      endpoint: process.env.S3_ENDPOINT ?? '',
      region: process.env.S3_REGION ?? 'eu-west-3',
      bucket: process.env.S3_BUCKET ?? 'atlas-documents',
      accessKeyId: process.env.S3_ACCESS_KEY_ID ?? '',
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? '',
      forcePathStyle: (process.env.S3_FORCE_PATH_STYLE ?? 'true') === 'true',
    },
  },
});
