import { beforeAll, beforeEach, afterAll, describe, expect, it } from 'vitest';
import request from 'supertest';
import { Pool } from 'pg';
import { createApp } from '../src/app.js';
import { migrate } from '../src/db.js';
import { readConfig } from '../src/config.js';

const url = process.env.TEST_DATABASE_URL ?? 'postgres://labreserve:labreserve_local@127.0.0.1:55432/labreserve_test';
if (!new URL(url).pathname.endsWith('_test')) throw new Error('Integration database name must end in _test');
const pool = new Pool({ connectionString: url });
const config = readConfig({ NODE_ENV: 'test', DATABASE_URL: url, APP_ORIGIN: 'http://localhost:3000', CSRF_SECRET: 'test-only-secret-with-at-least-32-characters' });
const app = createApp(pool, config);
type Client = Awaited<ReturnType<typeof client>>;
async function client(email = 'member@example.test', role = 'member') {
  const agent = request.agent(app);
  const csrf = (await agent.get('/api/v1/auth/csrf')).body.csrfToken as string;
  const write = (path: string, data: object) => agent.post(`/api/v1${path}`).set('Origin', config.origin).set('X-CSRF-Token', csrf).send(data);
  const res = await write('/auth/register', { email, password: 'Learning-demo-123!' });
  expect(res.status).toBe(201);
  if (role === 'admin') await pool.query("UPDATE users SET role='admin' WHERE id=$1", [res.body.user.id]);
  return { agent, csrf, write, id: res.body.user.id as string };
}
async function equipment(admin: Client, code = 'CAM-001') {
  const res = await admin.write('/equipment', { assetCode: code, name: 'กล้องสำหรับห้องแล็บ', description: 'กล้องทดสอบ' });
  expect(res.status).toBe(201);
  return res.body.item.id as string;
}
const future = (days: number) => new Date(Date.now() + days * 86400000).toISOString();
beforeAll(async () => migrate(pool));
beforeEach(async () => { await pool.query('TRUNCATE reservation_events, reservations, equipment, sessions, users CASCADE'); });
afterAll(async () => pool.end());

describe('authentication and equipment boundaries', () => {
  it('normalizes email, hides hashes and authenticates a session', async () => {
    const c = await client('  Member@Example.test  ');
    const me = await c.agent.get('/api/v1/auth/me');
    expect(me.body.user).toEqual({ id: c.id, email: 'member@example.test', role: 'member' });
    expect(JSON.stringify(me.body)).not.toContain('password');
  });
  it('rejects duplicate email and wrong password, rotates login and invalidates logout', async () => {
    const c = await client();
    expect((await c.write('/auth/register', { email: 'MEMBER@example.test', password: 'Learning-demo-123!' })).status).toBe(409);
    expect((await c.write('/auth/login', { email: 'member@example.test', password: 'wrong-password' })).status).toBe(401);
    expect((await c.write('/auth/login', { email: 'member@example.test', password: 'Learning-demo-123!' })).status).toBe(200);
    expect(Number((await pool.query('SELECT count(*) FROM sessions')).rows[0].count)).toBe(1);
    expect((await c.write('/auth/logout', {})).status).toBe(204);
    expect((await c.agent.get('/api/v1/auth/me')).status).toBe(401);
  });
  it('rejects missing CSRF, foreign origins and expired sessions', async () => {
    const c = await client();
    expect((await c.agent.post('/api/v1/auth/logout').set('Origin', config.origin).send({})).status).toBe(403);
    expect((await c.agent.post('/api/v1/auth/logout').set('Origin', 'https://evil.test').set('X-CSRF-Token', c.csrf).send({})).status).toBe(403);
    await pool.query("UPDATE sessions SET expires_at=now()-interval '1 minute'");
    expect((await c.agent.get('/api/v1/auth/me')).status).toBe(401);
  });
  it('enforces administrator access and bounded pagination', async () => {
    const c = await client();
    expect((await c.write('/equipment', { assetCode: 'ABC', name: 'test' })).status).toBe(403);
    const a = await client('admin@example.test', 'admin');
    const id = await equipment(a);
    const list = await c.agent.get('/api/v1/equipment?page=1&pageSize=1');
    expect(list.body.total).toBe(1);
    expect(list.body.items[0].id).toBe(id);
    expect((await c.agent.get('/api/v1/equipment?pageSize=10000')).status).toBe(400);
    expect((await c.agent.get('/api/v1/equipment/not-a-uuid')).status).toBe(400);
    expect((await c.agent.get('/api/v1/equipment?q=%27%20OR%201=1--')).body.total).toBe(0);
  });
});

describe('transactional reservations', () => {
  it('allows only one overlapping concurrent booking and returns conflict', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const id = await equipment(a);
    const body = { equipmentId: id, startAt: future(1), endAt: future(2) };
    const results = await Promise.all([c.write('/reservations', body), a.write('/reservations', body)]);
    expect(results.map(r => r.status).sort()).toEqual([201, 409]);
    expect(Number((await pool.query('SELECT count(*) FROM reservations')).rows[0].count)).toBe(1);
    expect(Number((await pool.query('SELECT count(*) FROM reservation_events')).rows[0].count)).toBe(1);
  });
  it('allows adjacent bookings and makes cancelled time available', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const id = await equipment(a);
    const startAt = future(1), middle = future(2), endAt = future(3);
    const first = await c.write('/reservations', { equipmentId: id, startAt, endAt: middle });
    expect(first.status).toBe(201);
    expect((await c.write('/reservations', { equipmentId: id, startAt: middle, endAt })).status).toBe(201);
    const availability = await c.agent.get(`/api/v1/equipment/${id}/availability`).query({startAt, endAt});
    expect(availability.body.items).toHaveLength(2);
    expect(availability.body.items[0]).not.toHaveProperty('userId');
    expect((await c.write(`/reservations/${first.body.item.id}/cancel`, {})).status).toBe(200);
    expect((await c.write('/reservations', { equipmentId: id, startAt, endAt: middle })).status).toBe(201);
  });
  it('hides other users reservations and denies cancellation', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const other = await client('other@example.test');
    const id = await equipment(a);
    const booking = await c.write('/reservations', { equipmentId: id, startAt: future(1), endAt: future(2) });
    const path = `/api/v1/reservations/${booking.body.item.id}`;
    expect((await other.agent.get(path)).status).toBe(404);
    expect((await other.write(`/reservations/${booking.body.item.id}/cancel`, {})).status).toBe(404);
    expect((await other.agent.get('/api/v1/reservations')).body.total).toBe(0);
    const detail = await c.agent.get(path);
    expect(detail.body.item.events).toHaveLength(1);
    expect((await a.agent.get('/api/v1/reservations?scope=all')).body.total).toBe(1);
  });
  it('rejects invalid dates, inactive equipment and repeated cancellation', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const id = await equipment(a);
    expect((await c.write('/reservations', { equipmentId: id, startAt: future(-2), endAt: future(-1) })).status).toBe(400);
    const b = await c.write('/reservations', { equipmentId: id, startAt: future(1), endAt: future(2) });
    const results = await Promise.all([c.write(`/reservations/${b.body.item.id}/cancel`, {}), c.write(`/reservations/${b.body.item.id}/cancel`, {})]);
    expect(results.map(r => r.status).sort()).toEqual([200,409]);
    expect(Number((await pool.query("SELECT count(*) FROM reservation_events WHERE event_type='cancelled'")).rows[0].count)).toBe(1);
    expect((await a.agent.patch(`/api/v1/equipment/${id}`).set('Origin', config.origin).set('X-CSRF-Token', a.csrf).send({active: false})).status).toBe(200);
    expect((await c.write('/reservations', { equipmentId: id, startAt: future(1), endAt: future(2) })).status).toBe(409);
  });
  it('rolls back reservation when history insertion fails', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const id = await equipment(a);
    await pool.query("ALTER TABLE reservation_events ADD CONSTRAINT test_fail_event CHECK (event_type <> 'created')");
    try {
      expect((await c.write('/reservations', { equipmentId: id, startAt: future(1), endAt: future(2) })).status).toBe(500);
      expect(Number((await pool.query('SELECT count(*) FROM reservations')).rows[0].count)).toBe(0);
    } finally { await pool.query('ALTER TABLE reservation_events DROP CONSTRAINT test_fail_event'); }
  });
  it('enforces member deadline and admin reason on active reservations', async () => {
    const a = await client('admin@example.test', 'admin');
    const c = await client();
    const id = await equipment(a);
    const b = await c.write('/reservations', { equipmentId: id, startAt: future(1), endAt: future(2) });
    await pool.query("UPDATE reservations SET start_at=now()-interval '1 hour' WHERE id=$1", [b.body.item.id]);
    expect((await c.write(`/reservations/${b.body.item.id}/cancel`, {})).status).toBe(409);
    expect((await a.write(`/reservations/${b.body.item.id}/cancel`, {})).status).toBe(400);
    expect((await a.write(`/reservations/${b.body.item.id}/cancel`, {reason:'ส่งซ่อม'})).status).toBe(200);
  });
});
