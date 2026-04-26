// Закладки на запуск dev-серверов: { id, label, cwd, cmd, port? }
const fs = require('fs');
const path = require('path');
const os = require('os');

const FILE = path.join(os.homedir(), '.portman', 'bookmarks.json');

function ensure() {
  const d = path.dirname(FILE);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function list() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { return []; }
}

function save(items) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2));
}

function add(b) {
  const items = list();
  const id = String(Date.now()) + Math.random().toString(36).slice(2, 5);
  const item = { id, label: String(b.label || '').trim(), cwd: String(b.cwd || '').trim(), cmd: String(b.cmd || '').trim(), port: b.port ? +b.port : null };
  if (!item.label || !item.cwd || !item.cmd) return null;
  items.push(item);
  save(items);
  return item;
}

function remove(id) {
  save(list().filter(b => b.id !== id));
}

function get(id) {
  return list().find(b => b.id === id) || null;
}

module.exports = { list, save, add, remove, get };
