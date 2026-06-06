import { z } from 'zod';

/**
 * Validated environment configuration. Imported by the server entry point so the
 * process fails fast with a clear message instead of crashing later on a missing
 * `process.env.X!` non-null assertion.
 *
 * NOTE: This module calls `process.exit(1)` on invalid config, so it must only be
 * imported by the real server boot path (src/index.ts) — never by route files that
 * are unit/integration tested in isolation.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3016),
  JWT_SECRET: z.string().min(32, 'must be at least 32 characters'),
  DATABASE_URL: z.string().min(1, 'is required'),
  TRACCAR_URL: z.string().url('must be a valid URL'),
  TRACCAR_ADMIN_EMAIL: z.string().email('must be a valid email'),
  TRACCAR_ADMIN_PASSWORD: z.string().min(1, 'is required'),
  CORS_ORIGIN: z.string().default('*'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration — refusing to start:');
  for (const issue of parsed.error.issues) {
    console.error(`   - ${issue.path.join('.')} ${issue.message}`);
  }
  process.exit(1);
}

export const env = parsed.data;
