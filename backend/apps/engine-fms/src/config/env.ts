import { z } from 'zod';

/**
 * Validated environment configuration. Imported by the server entry point so the
 * process fails fast with a clear message instead of crashing later on a missing
 * `process.env.X!` non-null assertion.
 *
 * NOTE: This module calls `process.exit(1)` on invalid config, so it must only be
 * imported by the real server boot path (src/index.ts) - never by route files that
 * are unit/integration tested in isolation.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3016),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  DATABASE_URL: z.string().min(1, 'is required'),
  REDIS_URL: z.string().min(1, 'is required'),
  TRACCAR_URL: z.string().url('must be a valid URL'),
  TRACCAR_OSMAND_ENDPOINT: z.string().url('must be a valid URL'),
  TRACCAR_ADMIN_EMAIL: z.string().email('must be a valid email'),
  TRACCAR_ADMIN_PASSWORD: z.string().min(1, 'is required'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration - refusing to start:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')} ${issue.message}`);
  }
  process.exit(1);
}

function isLocalUrl(value: string): boolean {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|10\.0\.2\.2/i.test(value);
}

const env = parsed.data;

if (env.NODE_ENV === 'production') {
  const issues: string[] = [];

  if (env.CORS_ORIGIN === '*') {
    issues.push('CORS_ORIGIN must be set to a specific dashboard origin in production');
  }

  if (isLocalUrl(env.DATABASE_URL)) {
    issues.push('DATABASE_URL must not point at localhost in production');
  }

  if (isLocalUrl(env.REDIS_URL)) {
    issues.push('REDIS_URL must not point at localhost in production');
  }

  if (isLocalUrl(env.TRACCAR_URL)) {
    issues.push('TRACCAR_URL must not point at localhost in production');
  }

  if (isLocalUrl(env.TRACCAR_OSMAND_ENDPOINT)) {
    issues.push('TRACCAR_OSMAND_ENDPOINT must not point at localhost in production');
  }

  if (!env.CORS_ORIGIN.startsWith('https://')) {
    issues.push('CORS_ORIGIN must use HTTPS in production');
  }

  if (!env.TRACCAR_OSMAND_ENDPOINT.startsWith('https://')) {
    issues.push('TRACCAR_OSMAND_ENDPOINT must use HTTPS in production');
  }

  if (/CHANGE_ME|password|secret|12345/i.test(env.JWT_SECRET) || env.JWT_SECRET.length < 64) {
    issues.push('JWT_SECRET must be a strong random secret in production');
  }

  if (issues.length > 0) {
    console.error('❌ Invalid production configuration - refusing to start:');
    for (const issue of issues) {
      console.error(`   - ${issue}`);
    }
    process.exit(1);
  }
}

export { env };
