import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request, Response, RequestHandler } from 'express';
import type { Pool, PoolClient } from 'pg';
import type { User } from '../../../../packages/contracts/src/index.js';
import type { Config } from '../config.js';
import { AppError } from '../errors.js';
// Express declares Request in this namespace; augmenting it keeps middleware typed.
// eslint-disable-next-line @typescript-eslint/no-namespace
declare global { namespace Express { interface Request { user?: User } } }
export const tokenHash = (token: string) => createHash('sha256').update(token).digest('hex');
export const sessionName = (c: Config) => c.secure ? '__Host-lab_session' : 'lab_session';
const csrfName = (c: Config) => c.secure ? '__Host-lab_csrf' : 'lab_csrf';
const options = (c: Config) => ({ httpOnly: true, sameSite: 'strict' as const, secure: c.secure, path: '/' });
const equal = (a: string, b: string) => a.length === b.length && timingSafeEqual(Buffer.from(a), Buffer.from(b));
export function issueCsrf(res: Response, c: Config) {
  const nonce = randomBytes(32).toString('hex');
  const token = `${nonce}.${createHmac('sha256', c.csrfSecret).update(nonce).digest('hex')}`;
  res.cookie(csrfName(c), token, options(c));
  return token;
}
export function csrfGuard(c: Config): RequestHandler {
  return (req, _res, next) => {
    if (['GET','HEAD','OPTIONS'].includes(req.method)) return next();
    const token: unknown = req.cookies[csrfName(c)];
    const header = req.get('X-CSRF-Token');
    if (req.get('Origin') !== c.origin || typeof token !== 'string' || !/^[a-f0-9]{64}\.[a-f0-9]{64}$/.test(token) || !header || !equal(token, header)) return next(new AppError(403, 'CSRF_FAILED', 'กรุณาโหลดหน้าใหม่แล้วลองอีกครั้ง'));
    const [nonce, signature] = token.split('.');
    if (!equal(signature, createHmac('sha256', c.csrfSecret).update(nonce).digest('hex'))) return next(new AppError(403, 'CSRF_FAILED', 'คำขอไม่ถูกต้อง'));
    next();
  };
}
export function authenticate(pool: Pool, c: Config): RequestHandler {
  return async (req, _res, next) => {
    const token: unknown = req.cookies[sessionName(c)];
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) throw new AppError(401, 'UNAUTHENTICATED', 'กรุณาเข้าสู่ระบบ');
    const result = await pool.query<User>('SELECT u.id,u.email,u.role FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=$1 AND s.expires_at>now()', [tokenHash(token)]);
    if (!result.rows[0]) throw new AppError(401, 'UNAUTHENTICATED', 'เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่');
    req.user = result.rows[0]; next();
  };
}
export const adminOnly: RequestHandler = (req, _res, next) => {
  if (req.user?.role !== 'admin') throw new AppError(403, 'FORBIDDEN', 'สำหรับผู้ดูแลเท่านั้น'); next();
};
export async function newSession(db: PoolClient, req: Request, userId: string, c: Config): Promise<string> {
  const old: unknown = req.cookies[sessionName(c)];
  if (typeof old === 'string') await db.query('DELETE FROM sessions WHERE token_hash=$1', [tokenHash(old)]);
  await db.query('DELETE FROM sessions WHERE expires_at<=now()');
  const token = randomBytes(32).toString('hex');
  await db.query("INSERT INTO sessions(token_hash,user_id,expires_at) VALUES($1,$2,now()+interval '8 hours')", [tokenHash(token), userId]);
  return token;
}
export function setSession(res: Response, token: string, c: Config) { res.cookie(sessionName(c), token, {...options(c), maxAge: 8 * 3600000}); }
export function clearSession(res: Response, c: Config) { res.clearCookie(sessionName(c), options(c)); }
