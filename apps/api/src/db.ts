import type { Pool, PoolClient } from 'pg';
import { readdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
export async function transaction<T>(pool: Pool, work: (client: PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try { await client.query('BEGIN'); const result = await work(client); await client.query('COMMIT'); return result; }
  catch (error) { await client.query('ROLLBACK'); throw error; }
  finally { client.release(); }
}
export async function migrate(pool: Pool): Promise<void> {
  await transaction(pool, async c => {
    await c.query('SELECT pg_advisory_xact_lock(481203)');
    await c.query('CREATE TABLE IF NOT EXISTS schema_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
    const dir = resolve('apps/api/migrations');
    for (const name of (await readdir(dir)).filter(n => n.endsWith('.sql')).sort()) {
      if ((await c.query('SELECT 1 FROM schema_migrations WHERE name=$1', [name])).rowCount) continue;
      await c.query(await readFile(resolve(dir, name), 'utf8'));
      await c.query('INSERT INTO schema_migrations(name) VALUES($1)', [name]);
    }
  });
}
