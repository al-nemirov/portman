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

// Сэмплирование CPU: считаем дельту cpuTime между снимками для расчёта CPU%.
// Возвращает Map<pid, cpuPct>.
function sampleCpu(stats) {
  const data = load();
  const now = Date.now();
  const result = new Map();
  for (const [pid, s] of stats.entries()) {
    const key = String(pid);
    const entry = data[key] || {};
    if (entry.lastCpuTime != null && entry.lastCpuAt != null) {
      const dtCpu = s.cpuTime - entry.lastCpuTime;            // секунды CPU
      const dtWall = (now - entry.lastCpuAt) / 1000;          // секунды реального времени
      if (dtWall > 0.5) {
        // нормируем по числу ядер: процесс может использовать > 100% (нормализуем для UX)
        const cores = (require('os').cpus() || []).length || 1;
        const pct = Math.max(0, (dtCpu / dtWall) * 100 / cores);
        result.set(pid, Math.min(999, pct));
      }
    }
    entry.lastCpuTime = s.cpuTime;
    entry.lastCpuAt = now;
    data[key] = entry;
  }
  save(data);
  return result;
}

module.exports = { load, save, tick, sampleCpu };
