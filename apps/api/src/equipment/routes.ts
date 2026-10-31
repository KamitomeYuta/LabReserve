import { Router } from 'express';
import type { Pool } from 'pg';
import { z } from 'zod';
import {
  equipmentSchema,
  equipmentPatchSchema,
  paginationSchema,
  intervalSchema,
} from '../../../../packages/contracts/src/index.js';
import { adminOnly } from '../auth/security.js';
import { transaction } from '../db.js';
import { AppError } from '../errors.js';
const columns = 'id,asset_code AS "assetCode",name,description,active';
export function equipmentRoutes(pool: Pool) {
  const router = Router();
  router.get('/', async (req, res) => {
    const { page, pageSize, q } = paginationSchema.parse(req.query);
    const search = `%${q.replace(/[\\%_]/g, '\\$&')}%`;
    const condition = '(name ILIKE $1 OR asset_code ILIKE $1)';
    const items = (
      await pool.query(
        `SELECT ${columns} FROM equipment WHERE ${condition} ORDER BY asset_code,id LIMIT $2 OFFSET $3`,
        [search, pageSize, (page - 1) * pageSize],
      )
    ).rows;
    const total = Number(
      (await pool.query(`SELECT count(*) FROM equipment WHERE ${condition}`, [search])).rows[0]
        .count,
    );
    res.json({ items, total, page, pageSize });
  });
  router.post('/', adminOnly, async (req, res) => {
    const d = equipmentSchema.parse(req.body);
    const item = (
      await pool.query(
        `INSERT INTO equipment(asset_code,name,description) VALUES($1,$2,$3) RETURNING ${columns}`,
        [d.assetCode, d.name, d.description],
      )
    ).rows[0];
    res.status(201).json({ item });
  });
  router.get('/:id/availability', async (req, res) => {
    const id = z.uuid().parse(req.params.id),
      d = intervalSchema.parse(req.query);
    if (+new Date(d.startAt) >= +new Date(d.endAt))
      throw new AppError(400, 'INVALID_WINDOW', 'ช่วงเวลาไม่ถูกต้อง');
    if (!(await pool.query('SELECT 1 FROM equipment WHERE id=$1', [id])).rowCount)
      throw new AppError(404, 'NOT_FOUND', 'ไม่พบอุปกรณ์');
    const items = (
      await pool.query(
        "SELECT start_at AS \"startAt\",end_at AS \"endAt\" FROM reservations WHERE equipment_id=$1 AND status='confirmed' AND tstzrange(start_at,end_at,'[)') && tstzrange($2::timestamptz,$3::timestamptz,'[)') ORDER BY start_at LIMIT 200",
        [id, d.startAt, d.endAt],
      )
    ).rows;
    res.json({ items });
  });
  router.get('/:id', async (req, res) => {
    const item = (
      await pool.query(`SELECT ${columns} FROM equipment WHERE id=$1`, [
        z.uuid().parse(req.params.id),
      ])
    ).rows[0];
    if (!item) throw new AppError(404, 'NOT_FOUND', 'ไม่พบอุปกรณ์');
    res.json({ item });
  });
  router.patch('/:id', adminOnly, async (req, res) => {
    const id = z.uuid().parse(req.params.id),
      d = equipmentPatchSchema.parse(req.body);
    const item = await transaction(pool, async (db) => {
      if (!(await db.query('SELECT id FROM equipment WHERE id=$1 FOR UPDATE', [id])).rowCount)
        throw new AppError(404, 'NOT_FOUND', 'ไม่พบอุปกรณ์');
      return (
        await db.query(
          `UPDATE equipment SET asset_code=COALESCE($2,asset_code),name=COALESCE($3,name),description=COALESCE($4,description),active=COALESCE($5,active),updated_at=now() WHERE id=$1 RETURNING ${columns}`,
          [id, d.assetCode, d.name, d.description, d.active],
        )
      ).rows[0];
    });
    res.json({ item });
  });
  return router;
}
