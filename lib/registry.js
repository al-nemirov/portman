// Реестр запущенных dev-серверов в JSON
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(os.homedir(), '.devdispatcher');
const FILE = path.join(DIR, 'registry.json');

function ensure() {
  if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true });
  if (!fs.existsSync(FILE)) fs.writeFileSync(FILE, '[]');
}

function load() {
  ensure();
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return []; }
}

function save(list) {
  ensure();
  fs.writeFileSync(FILE, JSON.stringify(list, null, 2));
}

function add(entry) {
  const list = load();
  list.push(entry);
  save(list);
}

function remove(pid) {
  save(load().filter(e => e.pid !== pid));
}

function update(pid, patch) {
  const list = load().map(e => e.pid === pid ? { ...e, ...patch } : e);
  save(list);
}

module.exports = { load, save, add, remove, update, FILE };
