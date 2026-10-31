import { borrow, returnItem, type Item } from './inventory.js';
const items: Item[] = [
  { id: 'CAM-001', name: 'กล้อง', borrowed: false },
  { id: 'MIC-001', name: 'ไมโครโฟน', borrowed: true },
];
const [command = 'list', id = ''] = process.argv.slice(2);
try {
  if (command === 'list') console.table(items);
  else if (command === 'borrow') console.table(borrow(items, id));
  else if (command === 'return') console.table(returnItem(items, id));
  else if (command === 'search')
    console.table(items.filter((i) => i.name.includes(id) || i.id.includes(id)));
  else throw new Error('Use list | search <text> | borrow <id> | return <id>');
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
}
