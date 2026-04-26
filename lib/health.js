// HTTP health-check для портов с кэшированием.
// Пингаем GET / на http://127.0.0.1:port с таймаутом 1.5с.
// Результат кэшируется на 10 секунд.
const http = require('http');

const cache = new Map(); // port -> { status, ms, at }
const TTL = 10_000;

function ping(port) {
  return new Promise((resolve) => {
    const t0 = Date.now();
    const req = http.request({
      host: '127.0.0.1', port, path: '/', method: 'GET', timeout: 1500,
      headers: { 'User-Agent': 'portman-health/1.0' },
    }, (res) => {
      const ms = Date.now() - t0;
      // Сразу читаем и выкидываем body, чтобы не висели соединения
      res.resume();
      resolve({ status: res.statusCode, ms });
    });
    req.on('error', () => resolve({ status: 0, ms: Date.now() - t0 }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, ms: 1500 }); });
    req.end();
  });
}

async function check(ports) {
  const now = Date.now();
  const results = {};
  const todo = [];
  for (const p of ports) {
    const c = cache.get(p);
    if (c && now - c.at < TTL) results[p] = c;
    else todo.push(p);
  }
  // Параллельно, не ждём друг друга
  await Promise.all(todo.map(async (p) => {
    const r = await ping(p);
    const entry = { ...r, at: Date.now() };
    cache.set(p, entry);
    results[p] = entry;
  }));
  return results;
}

// Для registered-процессов: возвращает { ok|warn|fail, status, ms } или null если порт пропущен
async function checkRegistered(items) {
  const ports = items
    .filter(i => i.registered && !i.protected)
    .flatMap(i => i.ports.filter(p => p >= 1024 && p <= 65535));
  const r = await check([...new Set(ports)]);
  const map = {};
  for (const [port, v] of Object.entries(r)) {
    let level = 'fail';
    if (v.status >= 200 && v.status < 400) level = 'ok';
    else if (v.status >= 400 && v.status < 500) level = 'warn';
    else if (v.status >= 500) level = 'fail';
    else level = 'fail'; // 0 = down/refused
    map[port] = { level, status: v.status, ms: v.ms };
  }
  return map;
}

module.exports = { ping, check, checkRegistered };
