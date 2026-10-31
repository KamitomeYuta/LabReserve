import type { Pool } from 'pg';
import type { User } from '../../../../packages/contracts/src/index.js';
import { transaction } from '../db.js';
import { AppError } from '../errors.js';
import { assertBookingWindow, assertCancellation } from './rules.js';
import { detail } from './repository.js';
export async function book(
  pool: Pool,
  user: User,
  data: { equipmentId: string; startAt: string; endAt: string },
) {
  return transaction(pool, async (db) => {
    const equipment = (
      await db.query('SELECT active FROM equipment WHERE id=$1 FOR UPDATE', [data.equipmentId])
    ).rows[0];
    if (!equipment) throw new AppError(404, 'NOT_FOUND', 'ไม่พบอุปกรณ์');
    if (!equipment.active) throw new AppError(409, 'EQUIPMENT_INACTIVE', 'อุปกรณ์นี้ปิดรับจอง');
    assertBookingWindow(new Date(data.startAt), new Date(data.endAt));
    const { id } = (
      await db.query(
        'INSERT INTO reservations(equipment_id,user_id,start_at,end_at) VALUES($1,$2,$3,$4) RETURNING id',
        [data.equipmentId, user.id, data.startAt, data.endAt],
      )
    ).rows[0];
    await db.query(
      "INSERT INTO reservation_events(reservation_id,actor_id,event_type) VALUES($1,$2,'created')",
      [id, user.id],
    );
    return detail(db, id, user);
  });
}
export async function cancel(pool: Pool, user: User, id: string, reason: string) {
  return transaction(pool, async (db) => {
    const item = (
      await db.query(
        'SELECT * FROM reservations WHERE id=$1 AND ($2::boolean OR user_id=$3) FOR UPDATE',
        [id, user.role === 'admin', user.id],
      )
    ).rows[0];
    if (!item) throw new AppError(404, 'NOT_FOUND', 'ไม่พบรายการจอง');
    if (item.status === 'cancelled')
      throw new AppError(409, 'ALREADY_CANCELLED', 'รายการนี้ถูกยกเลิกแล้ว');
    assertCancellation(user.role, item.start_at, item.end_at, reason);
    await db.query(
      "UPDATE reservations SET status='cancelled',cancellation_reason=$2,updated_at=now() WHERE id=$1",
      [id, reason || null],
    );
    await db.query(
      "INSERT INTO reservation_events(reservation_id,actor_id,event_type,metadata) VALUES($1,$2,'cancelled',$3)",
      [id, user.id, JSON.stringify({ reason })],
    );
    return detail(db, id, user);
  });
}
