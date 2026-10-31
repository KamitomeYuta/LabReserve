import { z } from 'zod';

export const intervalSchema = z.object({ startAt: z.iso.datetime({ offset: true }), endAt: z.iso.datetime({ offset: true }) });
export const bookingSchema = intervalSchema.extend({ equipmentId: z.uuid() });
export const credentialsSchema = z.object({ email: z.string().trim().toLowerCase().max(254).pipe(z.email()), password: z.string().min(12).max(128) });
export const equipmentSchema = z.object({ assetCode: z.string().trim().min(1).max(40).regex(/^[A-Za-z0-9_-]+$/), name: z.string().trim().min(1).max(120), description: z.string().trim().max(1000).default('') });
export const equipmentPatchSchema = equipmentSchema.partial().extend({ active: z.boolean().optional() }).refine(v => Object.keys(v).length > 0);
export const paginationSchema = z.object({ page: z.coerce.number().int().min(1).max(10000).default(1), pageSize: z.coerce.number().int().min(1).max(50).default(12), q: z.string().trim().max(100).default('') });
export type Role = 'member' | 'admin';
export interface User { id: string; email: string; role: Role }
export interface Equipment { id: string; assetCode: string; name: string; description: string; active: boolean }
export interface Reservation { id: string; equipmentId: string; equipmentName: string; assetCode: string; userId: string; startAt: string; endAt: string; status: 'confirmed' | 'cancelled'; phase: 'upcoming' | 'active' | 'completed' | 'cancelled'; cancellationReason: string | null; events?: { id: string; eventType: string; createdAt: string; actorId: string; metadata: {reason?: string} }[] }
export interface PageResult<T> { items: T[]; total: number; page: number; pageSize: number }
