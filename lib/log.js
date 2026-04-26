// Append-only журнал событий (kill / register / sweep) в JSON Lines.
// ~/.portman/log.jsonl — раз в сутки ротируется в log.prev.jsonl.
const fs = require('fs');
const path = require('path');
const os = require('os');

const DIR = path.join(os.homedir(), '.portman');
const FILE = path.join(DIR, 'log.jsonl');
const PREV = path.join(DIR, 'log.prev.jsonl');
const MAX_BYTES = 2 * 1024 * 1024; // 2 MB

function ensure() { if (!fs.existsSync(DIR)) fs.mkdirSync(DIR, { recursive: true }); }

function rotateIfNeeded() {
  try {
    const st = fs.statSync(FILE);
    if (st.size > MAX_BYTES) {
      try { fs.unlinkSync(PREV); } catch {}
      fs.renameSync(FILE, PREV);
    }
  } catch { /* нет файла — ок */ }
}

function append(event) {
  ensure();
  rotateIfNeeded();
  const line = JSON.stringify({ at: Date.now(), ...event }) + '\n';
  try { fs.appendFileSync(FILE, line); } catch {}
}

// Читает последние N строк (быстро для маленьких файлов)
function tail(n = 100) {
  ensure();
  let buf = '';
  try { buf = fs.readFileSync(FILE, 'utf8'); } catch { return []; }
  const lines = buf.split('\n').filter(Boolean);
  const slice = lines.slice(-n);
  const out = [];
  for (const l of slice) {
    try { out.push(JSON.parse(l)); } catch {}
  }
  return out.reverse(); // самые свежие сверху
}

module.exports = { append, tail };
