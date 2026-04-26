// Получение RAM и CPU-времени процессов через PowerShell Get-Process одним вызовом.
// Возвращает Map<pid, { ram, cpuTime }>:
//   ram     — Working Set в байтах
//   cpuTime — суммарное CPU-время в секундах с момента запуска процесса
const { execFileSync } = require('child_process');

function getStats(pids) {
  if (!pids || pids.length === 0) return new Map();
  const idArg = [...new Set(pids)].join(',');
  // -ErrorAction SilentlyContinue: PID может умереть между netstat и Get-Process — это нормально
  // Дополнительно тянем ParentProcessId через WMI-запрос в одном пайпе
  const cmd =
    `$ids = @(${idArg}); ` +
    `$procs = Get-Process -Id $ids -ErrorAction SilentlyContinue | Select-Object Id,WS,CPU; ` +
    `$wmi = Get-CimInstance Win32_Process -ErrorAction SilentlyContinue | ` +
      `Where-Object { $ids -contains $_.ProcessId } | Select-Object ProcessId,ParentProcessId; ` +
    `@{procs=$procs; wmi=$wmi} | ConvertTo-Json -Depth 4 -Compress`;
  let out;
  try {
    out = execFileSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', cmd],
      { encoding: 'utf8', timeout: 8000, windowsHide: true });
  } catch { return new Map(); }
  if (!out || !out.trim()) return new Map();

  let parsed;
  try { parsed = JSON.parse(out); } catch { return new Map(); }
  let procArr = parsed.procs || [];
  let wmiArr = parsed.wmi || [];
  if (!Array.isArray(procArr)) procArr = [procArr];
  if (!Array.isArray(wmiArr)) wmiArr = [wmiArr];

  const ppidMap = new Map();
  for (const w of wmiArr) {
    if (w && w.ProcessId != null) ppidMap.set(w.ProcessId, w.ParentProcessId);
  }

  const map = new Map();
  for (const p of procArr) {
    if (!p || p.Id == null) continue;
    map.set(p.Id, {
      ram: typeof p.WS === 'number' ? p.WS : 0,
      cpuTime: typeof p.CPU === 'number' ? p.CPU : 0,
      ppid: ppidMap.has(p.Id) ? ppidMap.get(p.Id) : null,
    });
  }
  return map;
}

module.exports = { getStats };
