#!/usr/bin/env node
// Убить процесс: по pid, порту, или все idle/all
const reg = require('../lib/registry');
const scan = require('../lib/scan');

const arg = process.argv[2];
if (!arg) {
  console.log('Использование:');
  console.log('  devkill <pid>     убить конкретный pid');
  console.log('  devkill :3000     убить процесс на порту');
  console.log('  devkill idle      убить все idle (LISTEN без ESTABLISHED) из реестра');
  console.log('  devkill all       убить все из реестра');
  process.exit(0);
}

const listening = scan.listListening();
const registry = reg.load();

function killOne(pid) {
  const ok = scan.kill(pid);
  reg.remove(pid);
  console.log(`${ok ? 'OK' : 'FAIL'}  pid=${pid}`);
}

if (arg === 'all') {
  for (const e of registry) killOne(e.pid);
} else if (arg === 'idle') {
  const map = new Map(listening.map(e => [e.pid, e]));
  for (const e of registry) {
    const sc = map.get(e.pid);
    if (!sc || sc.established === 0) killOne(e.pid);
  }
} else if (arg.startsWith(':')) {
  const port = parseInt(arg.slice(1), 10);
  const targets = listening.filter(e => e.ports.includes(port));
  if (targets.length === 0) console.log(`Порт ${port}: ничего не слушает`);
  for (const t of targets) killOne(t.pid);
} else {
  const pid = parseInt(arg, 10);
  if (!pid) { console.log('Невалидный pid'); process.exit(1); }
  killOne(pid);
}
