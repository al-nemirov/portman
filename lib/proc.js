// Получение RAM и CPU-времени процессов через PowerShell Get-Process одним вызовом.
// Возвращает Map<pid, { ram, cpuTime }>:
//   ram     — Working Set в байтах
//   cpuTime — суммарное CPU-время в секундах с момента запуска процесса
const { execFileSync } = require('child_process');

function getStats(pids) {
  if (!pids || pids.length === 0) return new Map();
  const idArg = [...new Set(pids)].join(',');
  // -ErrorAction SilentlyContinue: PID может умереть между netstat и Get-Process — это нормально
  const cmd = `Get-Process -Id ${idArg} -ErrorAction SilentlyContinue | Select-Object Id,WS,CPU | ConvertTo-Json -Compress`;
  let out;
  try {
    out = execFileSync('powershell.exe',
      ['-NoProfile', '-NonInteractive', '-Command', cmd],
      { encoding: 'utf8', timeout: 8000, windowsHide: true });
  } catch { return new Map(); }
  if (!out || !out.trim()) return new Map();

  let arr;
  try { arr = JSON.parse(out); } catch { return new Map(); }
  if (!Array.isArray(arr)) arr = [arr]; // одиночный объект если pid один

  const map = new Map();
  for (const p of arr) {
    if (!p || p.Id == null) continue;
    map.set(p.Id, {
      ram: typeof p.WS === 'number' ? p.WS : 0,
      cpuTime: typeof p.CPU === 'number' ? p.CPU : 0,
    });
  }
  return map;
}

module.exports = { getStats };
