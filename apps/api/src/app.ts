import express from 'express';
import type { ErrorRequestHandler } from 'express';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import type { Pool } from 'pg';
import { ZodError } from 'zod';
import type { Config } from './config.js';
import { AppError } from './errors.js';
import { authRoutes } from './auth/routes.js';
import { authenticate, csrfGuard } from './auth/security.js';
import { equipmentRoutes } from './equipment/routes.js';
import { reservationRoutes } from './reservations/routes.js';
export function createApp(pool: Pool, config: Config) {
  const app = express();
  app.disable('x-powered-by');
  if (config.trustProxy) app.set('trust proxy', 1);
  app.use(
    helmet({
      strictTransportSecurity: config.secure ? undefined : false,
      contentSecurityPolicy: { directives: { upgradeInsecureRequests: config.secure ? [] : null } },
    }),
  );
  app.use(
    pinoHttp({
      level: config.mode === 'test' ? 'silent' : 'info',
      genReqId: () => randomUUID(),
      serializers: {
        req: (req) => ({
          id: req.id,
          method: req.method,
          url: typeof req.url === 'string' ? req.url.split('?')[0] : undefined,
        }),
        res: (res) => ({ statusCode: res.statusCode }),
      },
    }),
  );
  app.use((req, res, next) => {
    res.setHeader('X-Request-Id', String(req.id));
    next();
  });
  app.get('/health/live', (_req, res) => res.json({ status: 'ok' }));
  app.get('/health/ready', async (_req, res) => {
    try {
      await pool.query('SELECT 1');
      res.json({ status: 'ready' });
    } catch {
      res.status(503).json({ status: 'unavailable' });
    }
  });
  app.use(express.json({ limit: '16kb' }));
  app.use(cookieParser());
  app.use(
    '/api',
    (_req, res, next) => {
      res.setHeader('Cache-Control', 'no-store');
      next();
    },
    csrfGuard(config),
  );
  app.use('/api/v1/auth', authRoutes(pool, config));
  app.use('/api/v1/equipment', authenticate(pool, config), equipmentRoutes(pool));
  app.use('/api/v1/reservations', authenticate(pool, config), reservationRoutes(pool));
  app.use('/api', () => {
    throw new AppError(404, 'NOT_FOUND', 'ไม่พบ API นี้');
  });
  const web = resolve('apps/web/dist');
  if (existsSync(web)) {
    app.use(express.static(web, { index: false }));
    app.get('/{*path}', (_req, res) => res.sendFile(resolve(web, 'index.html')));
  }
  const errorHandler: ErrorRequestHandler = (error, req, res, _next) => {
    let status = 500,
      code = 'INTERNAL_ERROR',
      message = 'ระบบเกิดข้อผิดพลาด กรุณาลองใหม่หรือติดต่อผู้ดูแลพร้อม request ID';
    if (error instanceof AppError) ({ status, code, message } = error);
    else if (error instanceof ZodError) {
      status = 400;
      code = 'VALIDATION_ERROR';
      message = 'ข้อมูลไม่ถูกต้อง กรุณาตรวจรูปแบบและช่องที่จำเป็น';
    } else if (error?.code === '23P01') {
      status = 409;
      code = 'BOOKING_CONFLICT';
      message = 'มีการจองในช่วงเวลานี้แล้ว กรุณาเลือกเวลาอื่น';
    } else if (error?.code === '23505') {
      status = 409;
      code = 'ALREADY_EXISTS';
      message = 'ข้อมูลนี้มีอยู่แล้ว';
    } else if (error?.type === 'entity.parse.failed') {
      status = 400;
      code = 'INVALID_JSON';
      message = 'รูปแบบ JSON ไม่ถูกต้อง';
    } else if (error?.type === 'entity.too.large') {
      status = 413;
      code = 'PAYLOAD_TOO_LARGE';
      message = 'ข้อมูลมีขนาดใหญ่เกินไป';
    }
    if (status === 500)
      req.log.error(
        {
          errorCode: typeof error?.code === 'string' ? error.code : 'UNKNOWN',
          errorName: error instanceof Error ? error.name : 'Error',
        },
        'request failed',
      );
    res.status(status).json({ error: { code, message, requestId: String(req.id) } });
  };
  app.use(errorHandler);
  return app;
}
