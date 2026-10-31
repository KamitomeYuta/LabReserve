export interface Item {
  id: string;
  name: string;
  borrowed: boolean;
}
export function borrow(items: Item[], id: string): Item[] {
  const item = items.find((i) => i.id === id);
  if (!item) throw new Error('item not found');
  if (item.borrowed) throw new Error('already borrowed');
  return items.map((i) => (i.id === id ? { ...i, borrowed: true } : i));
}
export function returnItem(items: Item[], id: string): Item[] {
  if (!items.some((i) => i.id === id)) throw new Error('item not found');
  return items.map((i) => (i.id === id ? { ...i, borrowed: false } : i));
}
