import { describe, expect, it } from 'vitest';
import { assertBookingWindow, assertCancellation } from '../src/reservations/rules.js';
import { intervalSchema } from '../../../packages/contracts/src/index.js';
const now = new Date('2030-01-01T00:00:00Z');
describe('booking boundaries', () => {
  it('rejects zero length and backwards intervals', () => {
    expect(() => assertBookingWindow(now, now, now)).toThrow();
    expect(() => assertBookingWindow(new Date('2030-01-02'), now, now)).toThrow();
  });
  it('accepts start exactly now but rejects the past', () => {
    expect(() => assertBookingWindow(now, new Date('2030-01-02'), now)).not.toThrow();
    expect(() => assertBookingWindow(new Date('2029-12-31'), now, now)).toThrow();
  });
  it('requires an explicit timezone offset', () => {
    expect(intervalSchema.safeParse({ startAt: '2030-01-01T10:00', endAt: '2030-01-01T11:00' }).success).toBe(false);
    expect(intervalSchema.safeParse({ startAt: '2030-01-01T10:00:00+07:00', endAt: '2030-01-01T11:00:00+07:00' }).success).toBe(true);
  });
  it('blocks member cancellation at start', () => {
    expect(() => assertCancellation('member', now, new Date('2030-01-02'), '', now)).toThrow();
  });
  it('requires an admin reason and blocks cancellation at end', () => {
    const end = new Date('2030-01-02');
    expect(() => assertCancellation('admin', now, end, ' ', now)).toThrow();
    expect(() => assertCancellation('admin', now, end, 'ซ่อมอุปกรณ์', now)).not.toThrow();
    expect(() => assertCancellation('admin', now, end, 'ซ่อมอุปกรณ์', end)).toThrow();
  });
});
