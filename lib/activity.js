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
    const prev = data[key] || {
      firstSeen: now, lastConn: e.established, lastActiveAt: now,
      lastCpuTime: null, lastCpuAt: null,
    };
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

// Атомарный снимок: одно чтение + одно сохранение, обновляет conn-history и cpu-sample вместе.
// Возвращает { activity, cpuPct: Map<pid, %> }.
const CORES = (require('os').cpus() || []).length || 1;

function snapshot(listening, stats) {
  const data = load();
  const now = Date.now();
  const cpuPct = new Map();

  for (const e of listening) {
    const key = String(e.pid);
    const isNew = !data[key];
    const entry = data[key] || {
      firstSeen: now, lastConn: e.established, lastActiveAt: now,
      lastCpuTime: null, lastCpuAt: null,
    };
    if (!isNew && (e.established > 0 || e.established !== entry.lastConn)) {
      entry.lastActiveAt = now;
    }
    entry.lastConn = e.established;
    entry.lastSeenAt = now;

    const s = stats && stats.get(e.pid);
    if (s) {
      if (entry.lastCpuTime != null && entry.lastCpuAt != null) {
        const dtCpu = s.cpuTime - entry.lastCpuTime;
        const dtWall = (now - entry.lastCpuAt) / 1000;
        if (dtWall > 0.5) {
          const pct = Math.max(0, (dtCpu / dtWall) * 100 / CORES);
          cpuPct.set(e.pid, Math.min(999, pct));
        }
      }
      entry.lastCpuTime = s.cpuTime;
      entry.lastCpuAt = now;
    }
    data[key] = entry;
  }

  // GC старше 24h
  for (const k of Object.keys(data)) {
    if (now - (data[k].lastSeenAt || 0) > 24 * 3600 * 1000) delete data[k];
  }
  save(data);
  return { activity: data, cpuPct };
}

module.exports = { load, save, tick, snapshot };
