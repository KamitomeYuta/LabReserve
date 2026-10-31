import { Pool } from 'pg';
const url = process.env.DATABASE_URL;
if (!url || !new URL(url).pathname.endsWith('_race_test'))
  throw new Error('Use a dedicated database ending in _race_test');
const pool = new Pool({ connectionString: url });
try {
  await pool.query('CREATE TABLE IF NOT EXISTS teaching_race (slot text NOT NULL)');
  await pool.query('TRUNCATE teaching_race');
  await pool.query('DROP INDEX IF EXISTS teaching_race_unique');
  // Both clients observe an empty slot before either INSERT. No timer luck required.
  const observations = await Promise.all([
    pool.query("SELECT * FROM teaching_race WHERE slot='10:00'"),
    pool.query("SELECT * FROM teaching_race WHERE slot='10:00'"),
  ]);
  await Promise.all(
    observations.map((r) =>
      r.rowCount === 0
        ? pool.query("INSERT INTO teaching_race VALUES('10:00')")
        : Promise.resolve(),
    ),
  );
  console.log(
    'Naive check-then-insert rows:',
    Number((await pool.query('SELECT count(*) FROM teaching_race')).rows[0].count),
  );
  await pool.query('TRUNCATE teaching_race');
  await pool.query('CREATE UNIQUE INDEX teaching_race_unique ON teaching_race(slot)');
  const results = await Promise.allSettled([
    pool.query("INSERT INTO teaching_race VALUES('10:00')"),
    pool.query("INSERT INTO teaching_race VALUES('10:00')"),
  ]);
  console.log(
    'With unique constraint:',
    results
      .map((r) => r.status)
      .sort()
      .join(', '),
  );
  console.log(
    'Protected rows:',
    Number((await pool.query('SELECT count(*) FROM teaching_race')).rows[0].count),
  );
  if (results.filter((r) => r.status === 'fulfilled').length !== 1)
    throw new Error('Unexpected constraint result');
} finally {
  await pool.end();
}
