import { performance } from 'node:perf_hooks';
const origin = process.env.LOAD_ORIGIN ?? 'http://localhost:3000';
if (!['localhost', '127.0.0.1'].includes(new URL(origin).hostname))
  throw new Error('This teaching load test is restricted to localhost');
const concurrency = Number(process.env.LOAD_CONCURRENCY ?? 5),
  count = Number(process.env.LOAD_REQUESTS ?? 200);
if (
  !Number.isInteger(count) ||
  count < 1 ||
  count > 10000 ||
  !Number.isInteger(concurrency) ||
  concurrency < 1 ||
  concurrency > 50
)
  throw new Error('Use 1–10000 requests and concurrency 1–50');
let cookie = '';
async function call(path: string, options: RequestInit = {}) {
  const r = await fetch(`${origin}/api/v1${path}`, {
    ...options,
    headers: { ...options.headers, Cookie: cookie, Origin: origin },
  });
  const cookies = r.headers.getSetCookie().map((v) => v.split(';')[0]);
  if (cookies.length) cookie = [cookie, ...cookies].filter(Boolean).join('; ');
  return r;
}
const csrf = (await (await call('/auth/csrf')).json()) as { csrfToken: string };
const login = await call('/auth/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrfToken },
  body: JSON.stringify({
    email: process.env.LOAD_EMAIL ?? 'member@labreserve.test',
    password: process.env.LOAD_PASSWORD ?? 'Local-demo-123!',
  }),
});
if (!login.ok) throw new Error(`Login failed: ${login.status}`);
const durations: number[] = [];
let next = 0,
  errors = 0;
const start = performance.now();
await Promise.all(
  Array.from({ length: concurrency }, async () => {
    while (next++ < count) {
      const t = performance.now();
      const response = await call('/equipment?pageSize=12');
      await response.arrayBuffer();
      durations.push(performance.now() - t);
      if (!response.ok) errors++;
    }
  }),
);
const elapsed = performance.now() - start;
durations.sort((a, b) => a - b);
const percentile = (p: number) =>
  Number(durations[Math.max(0, Math.ceil(durations.length * p) - 1)].toFixed(2));
console.log(
  JSON.stringify(
    {
      timestamp: new Date().toISOString(),
      workload: 'authenticated equipment list, pageSize=12',
      origin,
      requests: count,
      concurrency,
      errors,
      durationMs: Math.round(elapsed),
      requestsPerSecond: Number((count / (elapsed / 1000)).toFixed(2)),
      p50Ms: percentile(0.5),
      p95Ms: percentile(0.95),
      p99Ms: percentile(0.99),
      note: 'Local synthetic measurement; not a production capacity claim',
    },
    null,
    2,
  ),
);
await call('/auth/logout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': csrf.csrfToken },
  body: '{}',
});
