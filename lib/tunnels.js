// Публичные туннели через cloudflared (предпочтительно) или ngrok.
// Запуск: cloudflared tunnel --url http://localhost:PORT — выводит публичный URL в stderr.
const { spawn } = require('child_process');
const { execSync } = require('child_process');

const tunnels = new Map(); // port -> { tool, url, child, startedAt }

function detectTool() {
  for (const tool of ['cloudflared', 'ngrok']) {
    try {
      execSync(`where ${tool}`, { stdio: 'ignore' });
      return tool;
    } catch {}
  }
  return null;
}

let TOOL = null;

function start(port) {
  if (!TOOL) TOOL = detectTool();
  if (!TOOL) return { ok: false, error: 'cloudflared or ngrok not found in PATH' };
  if (tunnels.has(port)) return { ok: true, ...tunnels.get(port) };

  let child;
  if (TOOL === 'cloudflared') {
    child = spawn('cloudflared', ['tunnel', '--url', `http://localhost:${port}`, '--no-autoupdate'], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
  } else {
    child = spawn('ngrok', ['http', String(port), '--log=stdout'], {
      windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'],
    });
  }

  const entry = { tool: TOOL, url: null, pid: child.pid, child, startedAt: Date.now(), port };
  tunnels.set(port, entry);

  const onData = (chunk) => {
    const s = chunk.toString();
    // cloudflared печатает что-то вроде "https://random-words.trycloudflare.com"
    const m = s.match(/https:\/\/[a-z0-9-]+\.(?:trycloudflare\.com|ngrok\.io|ngrok-free\.app)/i);
    if (m && !entry.url) entry.url = m[0];
  };
  child.stdout.on('data', onData);
  child.stderr.on('data', onData);
  child.on('exit', () => tunnels.delete(port));

  return { ok: true, port, tool: TOOL };
}

function stop(port) {
  const entry = tunnels.get(port);
  if (!entry) return { ok: false, error: 'no tunnel' };
  try { entry.child.kill('SIGTERM'); } catch {}
  tunnels.delete(port);
  return { ok: true };
}

function list() {
  const out = {};
  for (const [port, e] of tunnels.entries()) {
    out[port] = { tool: e.tool, url: e.url, startedAt: e.startedAt };
  }
  return out;
}

module.exports = { start, stop, list, detectTool };
