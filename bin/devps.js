#!/usr/bin/env node
// Список dev-серверов: реестр + скан слушающих портов
const reg = require('../lib/registry');
const scan = require('../lib/scan');

const listening = scan.listListening();
const registry = reg.load();

// Чистим из реестра мёртвые pid
const alive = registry.filter(e => scan.isAlive(e.pid));
if (alive.length !== registry.length) reg.save(alive);

const byPid = new Map(listening.map(e => [e.pid, e]));

console.log('\n== Зарегистрированные процессы ==');
if (alive.length === 0) console.log('  (пусто)');
for (const e of alive) {
  const sc = byPid.get(e.pid);
  const ports = sc ? sc.ports.join(',') : '-';
  const conn = sc ? sc.established : 0;
  const age = Math.round((Date.now() - e.startedAt) / 60000);
  console.log(`  pid=${e.pid}  ports=${ports}  conn=${conn}  age=${age}m  ${e.label || ''}`);
  console.log(`    cwd: ${e.cwd}`);
  console.log(`    cmd: ${e.cmd}`);
}

console.log('\n== Прочие LISTEN-процессы (не через devrun) ==');
const knownPids = new Set(alive.map(e => e.pid));
const others = listening.filter(e => !knownPids.has(e.pid));
if (others.length === 0) console.log('  (пусто)');
for (const e of others) {
  const name = scan.processInfo(e.pid) || '?';
  console.log(`  pid=${e.pid}  ports=${e.ports.join(',')}  conn=${e.established}  ${name}`);
}
console.log();
