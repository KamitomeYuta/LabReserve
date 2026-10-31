const items = [{ id: 'CAM-001', name: 'Camera', borrowed: false }];
function borrow(items, id) {
  const item = items.find((item) => item.id === id);
  if (!item) throw new Error('item not found');
  if (item.borrowed) throw new Error('already borrowed');
  return items.map((item) => (item.id === id ? { ...item, borrowed: true } : item));
}
const next = borrow(items, 'CAM-001');
console.log(next[0].id, next[0].borrowed);
console.log('original', items[0].borrowed);
