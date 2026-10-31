import { z } from 'zod';
const schema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().url(),
  APP_ORIGIN: z.string().url(),
  CSRF_SECRET: z.string().min(32),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  TRUST_PROXY: z.enum(['0', '1']).default('0'),
});
export function readConfig(env: Record<string, string | undefined> = process.env) {
  const c = schema.parse(env);
  const origin = new URL(c.APP_ORIGIN);
  if (origin.origin !== c.APP_ORIGIN || origin.username || origin.password) throw new Error('APP_ORIGIN must be an origin without path or credentials');
  if (c.NODE_ENV === 'production' && origin.protocol !== 'https:') throw new Error('Production APP_ORIGIN requires HTTPS');
  return { mode: c.NODE_ENV, databaseUrl: c.DATABASE_URL, origin: c.APP_ORIGIN, csrfSecret: c.CSRF_SECRET, port: c.PORT, trustProxy: c.TRUST_PROXY === '1', secure: c.NODE_ENV === 'production' };
}
export type Config = ReturnType<typeof readConfig>;
