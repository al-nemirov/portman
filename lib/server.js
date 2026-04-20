// HTTP-сервер с web-UI для portman
const http = require('http');
const fs = require('fs');
const path = require('path');
const reg = require('./registry');
const scan = require('./scan');
const activity = require('./activity');

// Кэш имён процессов, чтобы не дёргать tasklist каждый запрос
const nameCache = new Map();
function getName(pid) {
  if (nameCache.has(pid)) return nameCache.get(pid);
  const n = scan.processInfo(pid) || '?';
  nameCache.set(pid, n);
  return n;
}

// Глобальные настройки авто-режима (хранятся в файле)
const SETTINGS_FILE = path.join(require('os').homedir(), '.portman', 'settings.json');
function loadSettings() {
  const def = {
    autoEnabled: false,
    idleMinutes: 30,
    watchPortsFrom: 3000,
    watchPortsTo: 9999,
    extraProtectedNames: [],   // пользовательский whitelist имён процессов
    extraProtectedPorts: [],   // пользовательский whitelist портов
  };
  try { return { ...def, ...JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')) }; }
  catch { return def; }
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

function isProtected(item, settings) {
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

function snapshot() {
  const listening = scan.listListening();
  const act = activity.tick(listening);
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
    const item = {
      pid: e.pid,
      name: getName(e.pid),
      ports: e.ports,
      conn: e.established,
      registered: !!r,
      label: r?.label || null,
      cwd: r?.cwd || null,
      cmd: r?.cmd || null,
      ageMin: r ? Math.round((now - r.startedAt) / 60000) : null,
      idleSec,
      inDevRange,
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
  return { items, settings, generatedAt: now };
}

function autoSweep() {
  const s = loadSettings();
  if (!s.autoEnabled) return { killed: [] };
  const snap = snapshot();
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
  const html = fs.readFileSync(path.join(__dirname, '..', 'web', 'index.html'), 'utf8');

  const server = http.createServer(async (req, res) => {
    if (req.url === '/' || req.url === '/index.html') {
      return send(res, 200, html, 'text/html; charset=utf-8');
    }
    if (req.url === '/api/snapshot') {
      return send(res, 200, snapshot());
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

  // Авто-sweep раз в 60 секунд
  setInterval(() => {
    const r = autoSweep();
    if (r.killed.length) console.log(`[portman] auto-killed:`, r.killed);
  }, 60_000);

  return server;
}

module.exports = { start, snapshot, autoSweep, loadSettings, saveSettings };
