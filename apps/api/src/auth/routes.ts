import { Router } from 'express';
import type { Pool } from 'pg';
import argon2 from 'argon2';
import { rateLimit } from 'express-rate-limit';
import { credentialsSchema } from '../../../../packages/contracts/src/index.js';
import type { Config } from '../config.js';
import { AppError } from '../errors.js';
import { transaction } from '../db.js';
import { authenticate, issueCsrf, newSession, setSession, clearSession, tokenHash, sessionName } from './security.js';
export function authRoutes(pool: Pool, config: Config) {
  const router = Router();
  router.get('/csrf', (_req, res) => res.json({ csrfToken: issueCsrf(res, config) }));
  const limiter = rateLimit({ windowMs: 15*60*1000, limit: config.mode === 'test' ? 10000 : 30, standardHeaders: 'draft-8', legacyHeaders: false, handler: (_req, _res, next) => next(new AppError(429, 'RATE_LIMITED', 'ลองใหม่ในอีกสักครู่')) });
  router.post('/register', limiter, async (req, res) => {
    const data = credentialsSchema.parse(req.body);
    const hash = await argon2.hash(data.password, { type: argon2.argon2id });
    const result = await transaction(pool, async db => {
      const user = (await db.query('INSERT INTO users(email,password_hash) VALUES($1,$2) RETURNING id,email,role', [data.email, hash])).rows[0];
      return { user, token: await newSession(db, req, user.id, config) };
    });
    setSession(res, result.token, config); res.status(201).json({ user: result.user });
  });
  // Equal-cost verification for missing accounts avoids an obvious account-enumeration timing gap.
  const dummyHash = argon2.hash('unused-random-password-for-timing', { type: argon2.argon2id });
  router.post('/login', limiter, async (req, res) => {
    const data = credentialsSchema.parse(req.body);
    const user = (await pool.query('SELECT id,email,role,password_hash FROM users WHERE email=$1', [data.email])).rows[0];
    const valid = await argon2.verify(user?.password_hash ?? await dummyHash, data.password);
    if (!user || !valid) throw new AppError(401, 'INVALID_CREDENTIALS', 'อีเมลหรือรหัสผ่านไม่ถูกต้อง');
    const token = await transaction(pool, db => newSession(db, req, user.id, config));
    setSession(res, token, config); res.json({ user: { id: user.id, email: user.email, role: user.role } });
  });
  router.get('/me', authenticate(pool, config), (req, res) => res.json({ user: req.user }));
  router.post('/logout', async (req, res) => {
    const token: unknown = req.cookies[sessionName(config)];
    if (typeof token === 'string') await pool.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(token)]);
    clearSession(res, config); res.sendStatus(204);
  });
  return router;
}
