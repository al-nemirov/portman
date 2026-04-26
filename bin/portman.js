#!/usr/bin/env node
// Единый CLI portman: ui | ps | kill | run | auto
const { execSync } = require('child_process');

const sub = process.argv[2];
const rest = process.argv.slice(3);

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
  case 'ps':   process.argv = [process.argv[0], 'devps',   ...rest]; require('./devps.js');   break;
  case 'kill': process.argv = [process.argv[0], 'devkill', ...rest]; require('./devkill.js'); break;
  case 'run':  process.argv = [process.argv[0], 'devrun',  ...rest]; require('./devrun.js');  break;
  case 'auto': process.argv = [process.argv[0], 'devauto', ...rest]; require('./devauto.js'); break;
  case 'autostart-install': {
    const r = require('../lib/autostart').install();
    console.log(r.ok ? `[portman] autostart installed: ${r.target}` : `[portman] FAIL: ${r.error}`);
    process.exit(r.ok ? 0 : 1);
  }
  case 'autostart-uninstall': {
    const r = require('../lib/autostart').uninstall();
    console.log(r.ok ? '[portman] autostart removed' : `[portman] FAIL: ${r.error}`);
    process.exit(r.ok ? 0 : 1);
  }
  case 'autostart-status': {
    const r = require('../lib/autostart').status();
    console.log(r.installed ? '[portman] installed:\n' + r.info : '[portman] not installed');
    process.exit(0);
  }
  case 'tray': {
    const path = require('path');
    const { spawn } = require('child_process');
    const ps1 = path.join(__dirname, '..', 'portman-tray.ps1');
    const port = parseInt((rest.find(a => a.startsWith('--port=')) || '').slice(7), 10) || 9876;
    const child = spawn('powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-WindowStyle', 'Hidden', '-File', ps1, '-Port', String(port)],
      { detached: true, stdio: 'ignore' });
    child.unref();
    console.log(`[portman] tray launched, talking to http://127.0.0.1:${port}`);
    break;
  }
  default:
    console.log(`portman — localhost port dispatcher

Usage:
  portman ui [--port=9876] [--no-open]   start web UI and open browser
  portman ps                              list processes
  portman kill <pid|:port|idle|all>       kill
  portman run [--label=NAME] [--port=N] -- <cmd>   start with registration
  portman auto [--interval=60] [--idle=360]        background watcher (CLI)

Web UI at http://127.0.0.1:9876 — auto mode, port-range filter,
"kill" and "sweep now" buttons.`);
}
