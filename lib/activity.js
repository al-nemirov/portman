// Трекер активности процессов: храним историю ESTABLISHED-соединений,
// чтобы понимать "обновляется ли" сервер (есть свежие подключения / изменения)
const fs = require('fs');
const path = require('path');
const os = require('os');

const FILE = path.join(os.homedir(), '.portman', 'activity.json');

function ensureDir() {
  const d = path.dirname(FILE);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
}

function load() {
  ensureDir();
  if (!fs.existsSync(FILE)) return {};
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')); }
  catch { return {}; }
}

function save(data) {
  ensureDir();
  fs.writeFileSync(FILE, JSON.stringify(data));
}

// Обновить снимок активности: для каждого pid запомнить max conn и время последней активности
function tick(listening) {
  const data = load();
  const now = Date.now();
  for (const e of listening) {
    const key = String(e.pid);
    const isNew = !data[key];
    // Первое обнаружение = считаем «активным сейчас», idle отсчитывается от этого момента.
    // Иначе idle для idle-from-birth процессов был бы null, и auto-режим их не трогал.
    const prev = data[key] || { firstSeen: now, lastConn: e.established, lastActiveAt: now };
    if (!isNew && (e.established > 0 || e.established !== prev.lastConn)) {
      prev.lastActiveAt = now;
    }
    prev.lastConn = e.established;
    prev.lastSeenAt = now;
    data[key] = prev;
  }
  // удаляем старше 24h
  for (const k of Object.keys(data)) {
    if (now - (data[k].lastSeenAt || 0) > 24 * 3600 * 1000) delete data[k];
  }
  save(data);
  return data;
}

module.exports = { load, save, tick };
