#!/usr/bin/env node
// Единый CLI portman: ui | ps | kill | run | auto
const { execSync } = require('child_process');
const path = require('path');

const sub = process.argv[2];
const rest = process.argv.slice(3);

function exec(file) {
  require(path.join(__dirname, file));
}

switch (sub) {
  case 'ui': {
    const port = parseInt((rest.find(a => a.startsWith('--port=')) || '').slice(7), 10) || 9876;
    const noOpen = rest.includes('--no-open');
    const { start } = require('../lib/server');
    start(port);
    if (!noOpen) {
      try { execSync(`start "" "http://127.0.0.1:${port}"`, { shell: 'cmd.exe' }); } catch {}
    }
    break;
  }
  case 'ps':   process.argv = [process.argv[0], 'devps', ...rest];   exec('devps.js'); break;
  case 'kill': process.argv = [process.argv[0], 'devkill', ...rest]; exec('devkill.js'); break;
  case 'run':  process.argv = [process.argv[0], 'devrun', ...rest];  exec('devrun.js'); break;
  case 'auto': process.argv = [process.argv[0], 'devauto', ...rest]; exec('devauto.js'); break;
  default:
    console.log(`portman — диспетчер локальных портов

Использование:
  portman ui [--port=9876] [--no-open]   запустить web-UI и открыть в браузере
  portman ps                              список процессов
  portman kill <pid|:port|idle|all>      убить
  portman run [--label=NAME] [--port=N] -- <cmd>  запуск с регистрацией
  portman auto [--interval=60] [--idle=360]       фоновый watcher (CLI)

Web-UI на http://127.0.0.1:9876 — авто-режим, фильтр по диапазону портов,
кнопки "убить" и "прогнать сейчас".`);
}
