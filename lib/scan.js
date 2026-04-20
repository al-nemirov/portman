// Скан слушающих портов через netstat -ano (Windows)
const { execSync } = require('child_process');

function listListening() {
  let out;
  try { out = execSync('netstat -ano', { encoding: 'utf8' }); }
  catch { return []; }

  const result = new Map(); // pid -> { pid, ports:Set, established:number }
  for (const line of out.split(/\r?\n/)) {
    const parts = line.trim().split(/\s+/);
    if (parts.length < 4) continue;
    const proto = parts[0];
    if (proto !== 'TCP') continue;
    const local = parts[1];
    const state = parts[3];
    const pid = parseInt(parts[4], 10);
    if (!pid) continue;

    const m = local.match(/:(\d+)$/);
    if (!m) continue;
    const port = parseInt(m[1], 10);

    if (!result.has(pid)) result.set(pid, { pid, ports: new Set(), established: 0 });
    const entry = result.get(pid);
    if (state === 'LISTENING') entry.ports.add(port);
    if (state === 'ESTABLISHED') entry.established += 1;
  }

  return [...result.values()]
    .filter(e => e.ports.size > 0)
    .map(e => ({ pid: e.pid, ports: [...e.ports], established: e.established }));
}

function processInfo(pid) {
  try {
    // CSV: "Image Name","PID","Session Name","Session#","Mem Usage"
    const out = execSync(`tasklist /FI "PID eq ${pid}" /FO CSV /NH`, { encoding: 'utf8' });
    const m = out.match(/^"([^"]+)"/);
    return m ? m[1] : null;
  } catch { return null; }
}

function commandLine(pid) {
  // Получаем CWD/CommandLine через WMIC (доступно на Win10)
  try {
    const out = execSync(
      `wmic process where ProcessId=${pid} get CommandLine /FORMAT:LIST`,
      { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] }
    );
    const m = out.match(/CommandLine=(.+)/);
    return m ? m[1].trim() : null;
  } catch { return null; }
}

function isAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch { return false; }
}

function kill(pid) {
  try { execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' }); return true; }
  catch { return false; }
}

module.exports = { listListening, processInfo, commandLine, isAlive, kill };
