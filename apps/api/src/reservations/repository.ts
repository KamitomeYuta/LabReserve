import type { Pool, PoolClient } from 'pg';
import type { Reservation, User } from '../../../../packages/contracts/src/index.js';
import { AppError } from '../errors.js';
export const selection = `r.id,r.equipment_id AS "equipmentId",e.name AS "equipmentName",e.asset_code AS "assetCode",r.user_id AS "userId",r.start_at AS "startAt",r.end_at AS "endAt",r.status,r.cancellation_reason AS "cancellationReason",CASE WHEN r.status='cancelled' THEN 'cancelled' WHEN r.end_at<=now() THEN 'completed' WHEN r.start_at<=now() THEN 'active' ELSE 'upcoming' END AS phase`;
export async function detail(db: Pool | PoolClient, id: string, user: User): Promise<Reservation> {
  const result=await db.query<Reservation>(`SELECT ${selection} FROM reservations r JOIN equipment e ON e.id=r.equipment_id WHERE r.id=$1 AND ($2::boolean OR r.user_id=$3)`,[id,user.role==='admin',user.id]);
  const item=result.rows[0];
  if(!item) throw new AppError(404,'NOT_FOUND','ไม่พบรายการจอง');
  item.events=(await db.query('SELECT id,event_type AS "eventType",created_at AS "createdAt",actor_id AS "actorId",metadata FROM reservation_events WHERE reservation_id=$1 ORDER BY created_at,id',[id])).rows;
  return item;
}
