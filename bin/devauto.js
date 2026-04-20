#!/usr/bin/env node
// Авто-режим: периодически проверяет реестр и убивает idle-процессы старше N минут
//
// Использование:
//   devauto                       интервал 60s, idle-таймаут 360 минут (6ч)
//   devauto --interval=30 --idle=120
//
// Idle = LISTEN на порту, но 0 ESTABLISHED-соединений.

const reg = require('../lib/registry');
const scan = require('../lib/scan');

const argv = process.argv.slice(2);
let interval = 60, idleMin = 360;
for (const a of argv) {
  if (a.startsWith('--interval=')) interval = parseInt(a.slice(11), 10);
  if (a.startsWith('--idle=')) idleMin = parseInt(a.slice(7), 10);
}

console.log(`[devauto] interval=${interval}s, idle-timeout=${idleMin}m`);

function tick() {
  const list = reg.load();
  const listening = scan.listListening();
  const portMap = new Map(listening.map(e => [e.pid, e]));
  const now = Date.now();

  for (const e of list) {
    if (!scan.isAlive(e.pid)) { reg.remove(e.pid); continue; }
    const sc = portMap.get(e.pid);
    const ageMin = (now - e.startedAt) / 60000;
    const idle = !sc || sc.established === 0;
    if (idle && ageMin >= idleMin) {
      console.log(`[devauto] Убиваю idle pid=${e.pid} label=${e.label} age=${Math.round(ageMin)}m`);
      scan.kill(e.pid);
      reg.remove(e.pid);
    }
  }
}

tick();
setInterval(tick, interval * 1000);
