import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import { bookingSchema, paginationSchema } from '../../../../packages/contracts/src/index.js';
import { AppError } from '../errors.js';
import { detail, selection } from './repository.js';
import { book, cancel } from './service.js';
export function reservationRoutes(pool: Pool) {
  const router = Router();
  router.get('/', async (req, res) => {
    const { page, pageSize } = paginationSchema.parse(req.query);
    const scope = z.enum(['mine', 'all']).default('mine').parse(req.query.scope);
    if (scope === 'all' && req.user!.role !== 'admin')
      throw new AppError(403, 'FORBIDDEN', 'สำหรับผู้ดูแลเท่านั้น');
    const all = scope === 'all';
    const items = (
      await pool.query(
        `SELECT ${selection} FROM reservations r JOIN equipment e ON e.id=r.equipment_id WHERE ($1::boolean OR r.user_id=$2) ORDER BY r.created_at DESC,r.id LIMIT $3 OFFSET $4`,
        [all, req.user!.id, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = Number(
      (
        await pool.query(
          'SELECT count(*) FROM reservations r WHERE ($1::boolean OR r.user_id=$2)',
          [all, req.user!.id],
        )
      ).rows[0].count,
    );
    res.json({ items, total, page, pageSize });
  });
  router.post('/', async (req, res) =>
    res.status(201).json({ item: await book(pool, req.user!, bookingSchema.parse(req.body)) }),
  );
  router.get('/:id', async (req, res) =>
    res.json({ item: await detail(pool, z.uuid().parse(req.params.id), req.user!) }),
  );
  router.post('/:id/cancel', async (req, res) => {
    const { reason } = z.object({ reason: z.string().trim().max(500).default('') }).parse(req.body);
    res.json({ item: await cancel(pool, req.user!, z.uuid().parse(req.params.id), reason) });
  });
  return router;
}
