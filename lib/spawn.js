// Запуск dev-сервера в отдельном окне cmd с регистрацией в реестре.
// Используется и из bookmark-launcher, и (в будущем) из API-команды run.
const { spawn } = require('child_process');
const path = require('path');
const reg = require('./registry');
const scan = require('./scan');

function launch({ label, cwd, cmd, port }) {
  if (!label || !cwd || !cmd) return { ok: false, error: 'label/cwd/cmd required' };

  // Дедуп: убиваем idle-старые с тем же label или cwd
  const before = reg.load().filter(e => scan.isAlive(e.pid));
  const listening = scan.listListening();
  const portMap = new Map(listening.map(e => [e.pid, e]));
  for (const d of before) {
    if (d.label === label || d.cwd === cwd || (port && (portMap.get(d.pid)?.ports || []).includes(+port))) {
      const sc = portMap.get(d.pid);
      if (!sc || sc.established === 0) {
        scan.kill(d.pid);
        reg.remove(d.pid);
      }
    }
  }

  // Запуск в отдельном окне cmd, чтобы пользователь видел вывод
  // start "<title>" /D <cwd> cmd /k <команда>
  let child;
  try {
    child = spawn('cmd.exe', ['/c', 'start', `"${label}"`, '/D', cwd, 'cmd', '/k', cmd], {
      detached: true,
      stdio: 'ignore',
      windowsHide: false,
    });
    child.unref();
  } catch (e) {
    return { ok: false, error: e.message };
  }

  // child.pid — pid cmd /c, который тут же завершится после `start`.
  // Реальный pid процесса будем определять по порту через несколько секунд.
  reg.add({
    pid: child.pid || -1,
    label, cwd, cmd, hintPort: port ? +port : null,
    startedAt: Date.now(), pendingDetect: true,
  });

  return { ok: true, label };
}

module.exports = { launch };
