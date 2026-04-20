#!/usr/bin/env node
// Обёртка для запуска dev-сервера: регистрирует процесс и убивает дубликаты
//
// Использование:
//   devrun [--label=name] [--port=3000] -- <command> [args...]
// Пример:
//   devrun --label=moandanang --port=3000 -- npm run dev

const { spawn } = require('child_process');
const path = require('path');
const reg = require('../lib/registry');
const scan = require('../lib/scan');

const argv = process.argv.slice(2);
let label = null, hintPort = null;
const cmdArgs = [];
let passthrough = false;
for (const a of argv) {
  if (passthrough) { cmdArgs.push(a); continue; }
  if (a === '--') { passthrough = true; continue; }
  if (a.startsWith('--label=')) { label = a.slice(8); continue; }
  if (a.startsWith('--port=')) { hintPort = parseInt(a.slice(7), 10); continue; }
  cmdArgs.push(a);
}

if (cmdArgs.length === 0) {
  console.error('Не указана команда. Пример: devrun --label=foo --port=3000 -- npm run dev');
  process.exit(1);
}

const cwd = process.cwd();
const cmdStr = cmdArgs.join(' ');
label = label || path.basename(cwd);

// Дедупликация: ищем старые с тем же label или cwd
const before = reg.load().filter(e => scan.isAlive(e.pid));
const listening = scan.listListening();
const portMap = new Map(listening.map(e => [e.pid, e]));

const dupes = before.filter(e =>
  e.label === label || e.cwd === cwd || (hintPort && (portMap.get(e.pid)?.ports || []).includes(hintPort))
);

for (const d of dupes) {
  const sc = portMap.get(d.pid);
  const idle = !sc || sc.established === 0;
  if (idle) {
    console.log(`[devrun] Убиваю старый idle pid=${d.pid} label=${d.label}`);
    scan.kill(d.pid);
    reg.remove(d.pid);
  } else {
    console.log(`[devrun] Старый pid=${d.pid} label=${d.label} занят (${sc.established} conn) — оставляю`);
  }
}

// Запуск через cmd /c, чтобы работали npm/pnpm/npx
const child = spawn('cmd.exe', ['/c', ...cmdArgs], {
  cwd,
  stdio: 'inherit',
  windowsHide: false,
});

reg.add({
  pid: child.pid,
  label,
  cwd,
  cmd: cmdStr,
  hintPort,
  startedAt: Date.now(),
});

console.log(`[devrun] pid=${child.pid} label=${label} запущен`);

const cleanup = () => { reg.remove(child.pid); };
child.on('exit', (code) => { cleanup(); process.exit(code ?? 0); });
process.on('SIGINT', () => { try { child.kill(); } catch {} });
process.on('SIGTERM', () => { try { child.kill(); } catch {} });
