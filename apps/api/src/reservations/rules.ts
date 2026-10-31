import type { Role } from '../../../../packages/contracts/src/index.js';
import { AppError } from '../errors.js';
export function assertBookingWindow(start: Date, end: Date, now = new Date()): void {
  if (!Number.isFinite(+start) || !Number.isFinite(+end) || +start >= +end || +start < +now) throw new AppError(400, 'INVALID_WINDOW', 'เวลาเริ่มต้องไม่อยู่ในอดีต และเวลาสิ้นสุดต้องหลังเวลาเริ่ม');
}
export function assertCancellation(role: Role, start: Date, end: Date, reason: string, now = new Date()): void {
  if ((role === 'member' && +now >= +start) || (role === 'admin' && +now >= +end)) throw new AppError(409, 'CANCEL_DEADLINE', 'เลยเวลาที่สามารถยกเลิกรายการได้แล้ว');
  if (role === 'admin' && !reason.trim()) throw new AppError(400, 'REASON_REQUIRED', 'ผู้ดูแลต้องระบุเหตุผลที่ยกเลิก');
}
