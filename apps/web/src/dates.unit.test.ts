import { expect, it } from 'vitest';
import { bangkokToIso } from './dates.js';
it('converts Bangkok wall-clock to UTC independently of host timezone', () => {
  expect(bangkokToIso('2030-01-01T10:30')).toBe('2030-01-01T03:30:00.000Z');
  expect(bangkokToIso('2030-01-01T00:00')).toBe('2029-12-31T17:00:00.000Z');
});
it('rejects invalid or missing local dates instead of normalizing them', () => {
  expect(() => bangkokToIso('')).toThrow();
  expect(() => bangkokToIso('2030-02-30T10:00')).toThrow();
});
