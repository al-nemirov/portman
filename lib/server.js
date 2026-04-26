// HTTP-сервер с web-UI для portman
const http = require('http');
const fs = require('fs');
const path = require('path');
const reg = require('./registry');
const scan = require('./scan');
const activity = require('./activity');
const proc = require('./proc');
const health = require('./health');
const log = require('./log');
const project = require('./project');
const bookmarks = require('./bookmarks');
const spawnLib = require('./spawn');
const autostart = require('./autostart');
const tunnels = require('./tunnels');

// Кэш имён процессов, чтобы не дёргать tasklist каждый запрос.
// Чистим pid'ы, которых не было в последнем снимке — иначе после переиспользования
// PID системой вернётся стейл-имя.
const nameCache = new Map();
function getName(pid) {
  if (nameCache.has(pid)) return nameCache.get(pid);
  const n = scan.processInfo(pid) || '?';
  nameCache.set(pid, n);
  return n;
}
function pruneNameCache(currentPids) {
  for (const pid of nameCache.keys()) if (!currentPids.has(pid)) nameCache.delete(pid);
}

// Глобальные настройки авто-режима (хранятся в файле)
const SETTINGS_FILE = path.join(require('os').homedir(), '.portman', 'settings.json');
function loadSettings() {
  const def = {
    autoEnabled: false,
    idleMinutes: 30,
    watchPortsFrom: 3000,
    watchPortsTo: 9999,
    extraProtectedNames: [],
    extraProtectedPorts: [],
  };
  let raw = {};
  try { raw = JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { /* file missing or corrupt */ }
  // Валидация типов: corrupt JSON не должен ломать auto-режим
  const num = (v, d) => Number.isFinite(+v) && +v > 0 ? +v : d;
  const arr = (v) => Array.isArray(v) ? v : [];
  return {
    autoEnabled: !!raw.autoEnabled,
    idleMinutes: num(raw.idleMinutes, def.idleMinutes),
    watchPortsFrom: num(raw.watchPortsFrom, def.watchPortsFrom),
    watchPortsTo: num(raw.watchPortsTo, def.watchPortsTo),
    extraProtectedNames: arr(raw.extraProtectedNames).map(String).filter(Boolean),
    extraProtectedPorts: arr(raw.extraProtectedPorts).map(Number).filter(n => Number.isFinite(n) && n > 0),
  };
}

// Системные/важные процессы — никогда не убиваем из UI
const PROTECTED_NAMES = new Set([
  'System', 'svchost.exe', 'lsass.exe', 'services.exe', 'wininit.exe',
  'spoolsv.exe', 'csrss.exe', 'smss.exe', 'winlogon.exe', 'explorer.exe',
  'dwm.exe', 'fontdrvhost.exe', 'mDNSResponder.exe', 'AcrylicService.exe',
  'AnyDesk.exe', 'TeamViewer_Service.exe', 'GoogleDriveFS.exe',
  'mysqld.exe', 'postgres.exe', 'redis-server.exe', 'mongod.exe',
  'vmware-authd.exe', 'vpnclient_x64.exe', 'sabycenter.exe',
  'ss_conn_service.exe', 'ss_conn_service2.exe', 'Spotify.exe',
  'Code.exe', 'cursor.exe', 'idea64.exe', 'pycharm64.exe', 'webstorm64.exe',
]);

// Стандартные «не трогать» порты (БД, почта, веб-серверы)
const PROTECTED_PORTS = new Set([
  22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
  1433, 3306, 5432, 6379, 8080, 8443, 27017, 5984, 9200, 11211,
]);

// Self-PID и UI-порт portman'а — никогда не даём убить себя из своего же UI.
// Иначе клик "kill" по своему процессу мгновенно вырубает весь интерфейс.
const SELF_PID = process.pid;
let SELF_PORT = null;

function isProtected(item, settings) {
  if (item.pid === SELF_PID) return 'self';
  if (SELF_PORT && item.ports.includes(SELF_PORT)) return 'self';
  if (item.name && PROTECTED_NAMES.has(item.name)) return 'system';
  if ((settings.extraProtectedNames || []).includes(item.name)) return 'user';
  if (item.ports.some(p => p < 1024)) return 'low-port';
  if (item.ports.some(p => PROTECTED_PORTS.has(p))) return 'service-port';
  if (item.ports.some(p => (settings.extraProtectedPorts || []).includes(p))) return 'user';
  return null;
}
function saveSettings(s) {
  const d = path.dirname(SETTINGS_FILE);
  if (!fs.existsSync(d)) fs.mkdirSync(d, { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(s, null, 2));
}

function snapshot(opts = {}) {
  const listening = scan.listListening();
  pruneNameCache(new Set(listening.map(e => e.pid)));
  // skipStats=true для autoSweep — не нужен PowerShell для решения «убить ли idle»
  const stats = opts.skipStats ? null : proc.getStats(listening.map(e => e.pid));
  const { activity: act, cpuPct: cpuMap } = activity.snapshot(listening, stats);
  const registry = reg.load().filter(e => scan.isAlive(e.pid));
  reg.save(registry);
  const regMap = new Map(registry.map(e => [e.pid, e]));
  const now = Date.now();
  const settings = loadSettings();

  const items = listening.map(e => {
    const a = act[String(e.pid)] || {};
    const r = regMap.get(e.pid);
    const idleSec = a.lastActiveAt ? Math.round((now - a.lastActiveAt) / 1000) : null;
    const inDevRange = e.ports.some(p => p >= settings.watchPortsFrom && p <= settings.watchPortsTo);
    const st = stats ? stats.get(e.pid) : null;
    const item = {
      pid: e.pid,
      name: getName(e.pid),
      ports: e.ports,
      urls: e.ports.map(p => `http://localhost:${p}`),
      conn: e.established,
      registered: !!r,
      label: r?.label || null,
      cwd: r?.cwd || null,
      cmd: r?.cmd || null,
      project: r?.cwd ? project.detect(r.cwd) : null,
      ageMin: r ? Math.round((now - r.startedAt) / 60000) : null,
      idleSec,
      inDevRange,
      ramMB: st ? Math.round(st.ram / (1024 * 1024)) : null,
      cpuPct: cpuMap && cpuMap.has(e.pid) ? Math.round(cpuMap.get(e.pid) * 10) / 10 : null,
      ppid: st && st.ppid != null ? st.ppid : null,
      ramHist: act[String(e.pid)]?.ramHist ? act[String(e.pid)].ramHist.slice() : [],
      cpuHist: act[String(e.pid)]?.cpuHist ? act[String(e.pid)].cpuHist.slice() : [],
      tunnel: null, // заполним ниже
    };
    item.protected = isProtected(item, settings);
    return item;
  });
  // Сортируем: сначала зарегистрированные, потом dev-диапазон, потом всё прочее
  items.sort((a, b) => {
    if (a.registered !== b.registered) return a.registered ? -1 : 1;
    if (a.inDevRange !== b.inDevRange) return a.inDevRange ? -1 : 1;
    return a.pid - b.pid;
  });
  // Прикрепляем активные туннели по портам
  const tunMap = tunnels.list();
  for (const it of items) {
    for (const p of it.ports) {
      if (tunMap[p]) { it.tunnel = { port: p, ...tunMap[p] }; break; }
    }
  }

  return { items, settings, generatedAt: now };
}

function autoSweep() {
  const s = loadSettings();
  if (!s.autoEnabled) return { killed: [] };
  // Auto-sweep не нуждается в RAM/CPU — пропускаем PowerShell для скорости
  const snap = snapshot({ skipStats: true });
  const killed = [];
  for (const it of snap.items) {
    if (it.protected) continue;               // защищённые не трогаем никогда
    if (!it.inDevRange) continue;             // только dev-порты
    if (it.conn > 0) continue;                // занят — не трогаем
    if (it.idleSec === null) continue;        // нет истории — пропуск
    if (it.idleSec / 60 >= s.idleMinutes) {
      if (scan.kill(it.pid)) {
        killed.push(it.pid);
        reg.remove(it.pid);
        log.append({ type: 'auto-kill', pid: it.pid, name: it.name, ports: it.ports, label: it.label, idleMin: Math.round(it.idleSec/60) });
      }
    }
  }
  return { killed };
}

function send(res, code, body, type = 'application/json') {
  res.writeHead(code, { 'Content-Type': type, 'Cache-Control': 'no-store' });
  res.end(typeof body === 'string' ? body : JSON.stringify(body));
}

function readBody(req) {
  return new Promise((resolve) => {
    let buf = '';
    req.on('data', c => buf += c);
    req.on('end', () => {
      try { resolve(buf ? JSON.parse(buf) : {}); } catch { resolve({}); }
    });
  });
}

function start(port = 9876) {
  SELF_PORT = port;  // защищаем UI-порт portman'а от своего же kill
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  const server = http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      return send(res, 200, html, 'text/html; charset=utf-8');
    }
    if (req.url === '/favicon.png' || req.url === '/logo.png') {
      const file = path.join(__dirname, '..', req.url === '/logo.png' ? 'logo.png' : 'favicon.png');
      if (fs.existsSync(file)) {
        res.writeHead(200, { 'Content-Type': 'image/png', 'Cache-Control': 'max-age=86400' });
        return fs.createReadStream(file).pipe(res);
      }
    }
    if (req.url === '/api/snapshot') {
      return send(res, 200, snapshot());
    }
    if (req.url === '/api/log') {
      return send(res, 200, { events: log.tail(100) });
    }
    if (req.url === '/api/health' && req.method === 'POST') {
      const snap = snapshot({ skipStats: true });
      const map = await health.checkRegistered(snap.items);
      return send(res, 200, { health: map });
    }
    // Bookmarks CRUD
    if (req.url === '/api/bookmarks' && req.method === 'GET') return send(res, 200, { items: bookmarks.list() });
    if (req.url === '/api/bookmarks' && req.method === 'POST') {
      const b = await readBody(req);
      const item = bookmarks.add(b);
      return send(res, item ? 200 : 400, item || { error: 'label/cwd/cmd required' });
    }
    if (req.url.startsWith('/api/bookmarks/') && req.method === 'DELETE') {
      bookmarks.remove(req.url.slice('/api/bookmarks/'.length));
      return send(res, 200, { ok: true });
    }
    if (req.url === '/api/bookmarks/launch' && req.method === 'POST') {
      const { id } = await readBody(req);
      const b = bookmarks.get(id);
      if (!b) return send(res, 404, { error: 'not found' });
      const r = spawnLib.launch(b);
      log.append({ type: 'launch', label: b.label, cwd: b.cwd, ok: r.ok });
      return send(res, r.ok ? 200 : 500, r);
    }
    // Autostart
    if (req.url === '/api/autostart' && req.method === 'GET') return send(res, 200, autostart.status());
    if (req.url === '/api/autostart/install' && req.method === 'POST') return send(res, 200, autostart.install());
    if (req.url === '/api/autostart/uninstall' && req.method === 'POST') return send(res, 200, autostart.uninstall());
    // Tunnels
    if (req.url === '/api/tunnel/start' && req.method === 'POST') {
      const { port } = await readBody(req);
      const r = tunnels.start(+port);
      log.append({ type: 'tunnel-start', port: +port, ok: r.ok });
      return send(res, r.ok ? 200 : 500, r);
    }
    if (req.url === '/api/tunnel/stop' && req.method === 'POST') {
      const { port } = await readBody(req);
      const r = tunnels.stop(+port);
      log.append({ type: 'tunnel-stop', port: +port });
      return send(res, 200, r);
    }
    if (req.url === '/api/sweep' && req.method === 'POST') {
      return send(res, 200, autoSweep());
    }
    if (req.url === '/api/kill' && req.method === 'POST') {
      const body = await readBody(req);
      const pid = parseInt(body.pid, 10);
      if (!pid) return send(res, 400, { error: 'pid required' });
      // Серверная защита: повторно проверяем, не protected ли pid
      const snap = snapshot();
      const it = snap.items.find(x => x.pid === pid);
      if (it && it.protected) return send(res, 403, { error: 'protected', reason: it.protected });
      const ok = scan.kill(pid);
      reg.remove(pid);
      log.append({ type: 'manual-kill', pid, ok, name: it?.name || null, ports: it?.ports || [], label: it?.label || null });
      return send(res, 200, { ok });
    }
    if (req.url === '/api/settings' && req.method === 'POST') {
      const body = await readBody(req);
      const cur = loadSettings();
      saveSettings({ ...cur, ...body });
      return send(res, 200, loadSettings());
    }
    send(res, 404, { error: 'not found' });
  });

  server.listen(port, '127.0.0.1', () => {
    console.log(`[portman] UI: http://127.0.0.1:${port}`);
  });

  // Авто-sweep раз в 60 секунд (один таймер на инстанс UI)
  if (!start._autoTimer) {
    start._autoTimer = setInterval(() => {
      const r = autoSweep();
      if (r.killed.length) console.log(`[portman] auto-killed:`, r.killed);
    }, 60_000);
  }

  return server;
}

module.exports = { start, snapshot, autoSweep, loadSettings, saveSettings };
