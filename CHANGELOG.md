# Changelog

All notable changes to this project. Format loosely follows [Keep a Changelog](https://keepachangelog.com/).

## [v0.5.0] — 2026-04-26
### Added
- **Bookmarks** — save reusable launch recipes (label + cwd + cmd + port) to `~/.portman/bookmarks.json`. Drawer with one-click LAUNCH and add form.
- **Autostart on Windows logon** via Task Scheduler (`PORTMAN` task, runs as user, no UAC). UI buttons + CLI: `portman autostart-install` / `autostart-uninstall` / `autostart-status`.
- **Sparklines** for RAM and CPU — last 30 samples (~90s) rendered inline as SVG.
- **Process tree** — `↳<ppid>` shown next to each process name (parent PID via `Get-CimInstance Win32_Process`).
- **System tray icon** via `portman tray` — PowerShell NotifyIcon with Open UI / Toggle AUTO / Quit menu, auto-updating tooltip.
- **Public tunnels** — auto-detect `cloudflared` or `ngrok` in PATH. Per-row 🌐 TUNNEL button spawns tunnel and renders the public URL once detected.

## [v0.4.0] — 2026-04-26
### Added
- **Health check** — `GET /` ping for registered servers, colored dot in NAME column, hover for HTTP code + ms.
- **Event log** — append-only `~/.portman/log.jsonl` with 2 MB rotation, viewer drawer.
- **Project detection** — parse `package.json` / `Cargo.toml` / `go.mod` / `requirements.txt` / `Gemfile` / `composer.json`. 19 frameworks recognized (Next.js, Nuxt, Astro, SvelteKit, Vite, Remix, Vue, Angular, CRA, Express, Fastify, Koa, Hapi, Electron, Rust, Go, Python, Ruby, PHP). Neon framework chip in row.
- **Keyboard shortcuts**: `/` search, `g` AUTO, `p` ping, `b` bookmarks, `l` log, `,` settings, `1`-`5` filters, `?` help, `Esc` close.

## [v0.3.1] — 2026-04-26
### Fixed
- **Self-protection** — portman cannot kill its own process or own UI port anymore. KILL button hidden in own row; API returns `403 protected (reason: self)` if frontend bypassed.

## [v0.3.0] — 2026-04-26
### Added
- **Standalone `portman.exe`** (~41 MB single file, no Node required) via `@yao-pkg/pkg`.
- `npm run build` → `dist/portman.exe`.

## [v0.2.0] — 2026-04-26
### Added
- **80s synthwave UI** redesign: logo, perspective grid, neon glow, chrome gradient title.
- **i18n** — language switcher EN / KO / DE / ES, persistent in `localStorage`.
- **README translations** in all 4 languages.
- **Live RAM and CPU** per process via `Get-Process` PowerShell batch.
- **Clickable `localhost:PORT` links** in row.
- **Filter chips** (ALL / DEV / ACTIVE / IDLE / PROTECTED), instant search, sort by RAM / CPU / PORT / AGE / IDLE.

### Fixed
- `activity.js`: new processes initialize `lastActiveAt = now` so auto-mode no longer ignores idle-from-birth servers.
- `index.html`: HTML-escape process names/labels/cmd in table rows (XSS).
- `server.js`: prune `nameCache` for dead PIDs.
- `server.js`: dedupe `autoSweep` timer.

## [v0.1.0] — 2026-04-26
### Initial release
- Web UI on `http://127.0.0.1:9876` with phosphor green CRT theme.
- Three-layer protection: hardcoded names, port whitelist, server-side enforcement.
- Auto-mode for killing idle dev servers.
- One-click desktop launcher via VBS + `.lnk`.
- CLI: `ui`, `ps`, `kill`, `run`, `auto`.
- Zero npm dependencies at runtime.
