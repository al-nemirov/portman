// Установка/удаление автозапуска через Task Scheduler (schtasks).
// Запускается при логине пользователя, тихо в фоне.
const { execSync } = require('child_process');
const path = require('path');

const TASK_NAME = 'PORTMAN';

function getExePath() {
  // Если запущены из pkg-собранного .exe — process.execPath это сам portman.exe
  // Если из node bin/portman.js — собираем команду с node
  if (process.pkg) return { exe: process.execPath, args: 'ui --no-open' };
  const script = path.join(__dirname, '..', 'bin', 'portman.js');
  return { exe: process.execPath, args: `"${script}" ui --no-open` };
}

function install() {
  const { exe, args } = getExePath();
  const tr = `"${exe}" ${args}`;
  // /sc ONLOGON — при входе пользователя
  // /rl LIMITED — обычный пользователь, без UAC
  // /f — перезаписать
  try {
    execSync(`schtasks /create /tn "${TASK_NAME}" /tr ${tr} /sc ONLOGON /rl LIMITED /f`, { stdio: 'pipe' });
    return { ok: true, task: TASK_NAME, target: tr };
  } catch (e) {
    return { ok: false, error: e.stderr ? e.stderr.toString() : e.message };
  }
}

function uninstall() {
  try {
    execSync(`schtasks /delete /tn "${TASK_NAME}" /f`, { stdio: 'pipe' });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e.stderr ? e.stderr.toString() : e.message };
  }
}

function status() {
  try {
    const out = execSync(`schtasks /query /tn "${TASK_NAME}" /fo LIST`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return { installed: true, info: out.trim() };
  } catch {
    return { installed: false };
  }
}

module.exports = { install, uninstall, status, TASK_NAME };
