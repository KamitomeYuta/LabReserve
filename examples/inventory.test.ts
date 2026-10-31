import { expect, it } from 'vitest';
import { borrow, returnItem } from './inventory.js';
const items = [{ id: 'CAM-001', name: 'Camera', borrowed: false }];
it('borrows without mutating the original collection and rejects double borrowing', () => {
  const next = borrow(items, 'CAM-001');
  expect(next[0].borrowed).toBe(true);
  expect(items[0].borrowed).toBe(false);
  expect(() => borrow(next, 'CAM-001')).toThrow('already borrowed');
});
it('rejects unknown items and returns borrowed items', () => {
  expect(() => borrow(items, 'missing')).toThrow('not found');
  expect(returnItem(borrow(items, 'CAM-001'), 'CAM-001')[0].borrowed).toBe(false);
});
