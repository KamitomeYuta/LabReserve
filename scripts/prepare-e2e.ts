import { Pool } from 'pg';
import { execFileSync } from 'node:child_process';
import { migrate } from '../apps/api/src/db.js';
const url =
  process.env.E2E_DATABASE_URL ??
  'postgres://labreserve:labreserve_local@127.0.0.1:55432/labreserve_e2e_test';
if (!new URL(url).pathname.endsWith('_e2e_test'))
  throw new Error('Browser fixtures require dedicated _e2e_test database');
const pool = new Pool({ connectionString: url });
try {
  await migrate(pool);
  await pool.query('TRUNCATE reservation_events,reservations,equipment,sessions,users CASCADE');
} finally {
  await pool.end();
}
execFileSync(process.execPath, ['--import', 'tsx', 'apps/api/scripts/seed.ts'], {
  stdio: 'inherit',
  env: { ...process.env, DATABASE_URL: url, NODE_ENV: 'test', ALLOW_DEMO_SEED: '1' },
});
