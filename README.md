<p align="center">
  <img src="logo.png" alt="PORTMAN" width="180">
</p>

<h1 align="center">PORTMAN</h1>

<p align="center">
  <b>English</b> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  Retro CRT-styled Windows dispatcher for localhost dev servers.<br>
  See what's listening, what's idle, kill duplicates, auto-clean stale dev servers.<br>
  One-click desktop launcher. UI in EN / KO / DE / ES.
</p>

[![Platform](https://img.shields.io/badge/platform-Windows-0a84ff)](https://github.com/al-nemirov/portman)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Style](https://img.shields.io/badge/style-CRT%20phosphor-33ff88)](#screenshots)

---

## Why

If you spend your day jumping between Next.js, Vite, Astro, Express, Python servers,
PHP built-in servers and so on, you end up with **a graveyard of forgotten `npm run dev`
processes** silently eating RAM and holding ports. The Windows Task Manager doesn't
help — it shows `node.exe` ten times with no clue which one is which project.

`portman` solves exactly that:

- One screen shows **every TCP LISTEN process** on your machine, grouped and
  color-coded.
- Tells you **which ones are actually being used** (open connections) and which
  are **idle** (listening but no one is talking to them).
- One click to **kill** an idle dev server. System processes are physically
  unclickable.
- An optional **auto-mode** sweeps idle dev servers older than N minutes — set it
  and forget it.
- A wrapper command `portman run -- npm run dev` registers your dev server with
  a label, and **automatically kills the previous instance** of the same project
  when you start a new one.
- **Live RAM and CPU per process** — sort by RAM ↓ to find the dev server
  that's secretly eating 2 GB.
- **Clickable `localhost:PORT` links** — open any dev server in a new tab
  straight from the table.
- **Filter chips** (ALL / DEV / ACTIVE / IDLE / PROTECTED) and **instant search**
  by PID / name / port / label / command.

## Screenshots

The UI is intentionally retro: phosphor green CRT, scanlines, dotted borders,
single big AUTO toggle. No menus. No tabs. No modals you don't need.

```
▎PORTMAN          PROC 26   IDLE 4   PROT 23      [● AUTO · ON]   [⚙]

PID    NAME              PORTS           CONN  STATUS    AGE · IDLE     ACTION
◈ 4    System            445 5357 139    0     PROTECTED — · —          ◈ LOCKED
◆ 4152 php.exe           8000            0     IDLE      — · 12m        ▸ KILL
● 9234 [moandanang] node 3000            2     ACTIVE    47m · 2s       ▸ KILL
◆ 7710 node.exe          5173            0     IDLE      — · 38m        ▸ KILL
◈ 6428 mysqld.exe        3306            0     PROTECTED — · —          ◈ LOCKED
```

Legend:
- `●` registered through `portman run` (you know what it is)
- `◆` unknown but inside dev-port range (3000–9999)
- `◈` system process — locked, kill button hidden

---

## Install

### Prerequisites
- **Windows 10 or 11**
- **Node.js ≥ 18** ([nodejs.org](https://nodejs.org))

### Option A — single .exe (no Node.js required)
Download **`portman.exe`** from the [latest release](https://github.com/al-nemirov/portman/releases/latest)
and put it anywhere (e.g. `C:\Tools\portman.exe`). Done. No install. Run with:
```powershell
portman.exe ui
```

> **First-run SmartScreen warning?** That's normal — see [SmartScreen FAQ](#why-does-windows-warn-me-about-portmanexe) below.

### Option B — from source (needs Node ≥18)
```powershell
git clone https://github.com/al-nemirov/portman.git C:\Tools\portman
cd C:\Tools\portman
node bin/portman.js ui
```
(no `npm install` needed at runtime — zero runtime dependencies)

### Make it global (optional, source install)
```powershell
npm link
```
After this you can type `portman` from anywhere.

### Build the .exe yourself
```powershell
npm install        # installs @yao-pkg/pkg as devDep
npm run build      # → dist/portman.exe (~41 MB, single file, no Node needed)
```

---

## Run

### One-click launch (recommended)

Double-click **`install-shortcut.bat`** once — it creates a `PORTMAN.lnk` icon
on your Desktop. After that, double-click the desktop icon to start. The server
runs silently in the background; your default browser opens
[http://127.0.0.1:9876](http://127.0.0.1:9876).

You can drag the shortcut into Start Menu or pin it to the Taskbar.

### Other launch options

| File / command | What it does |
|---|---|
| `portman.bat` | Run **with a console window** (logs visible, easy to stop with `Ctrl+C`) |
| `portman-silent.vbs` | Run silently in the background, no window at all |
| `portman ui` | Same as above (after `npm link`) |
| `portman ui --port=9000` | Use a custom UI port |
| `portman ui --no-open` | Don't auto-open the browser |

---

## Web UI

Visit [http://127.0.0.1:9876](http://127.0.0.1:9876).

The table refreshes every 3 seconds. There are **only two controls** in the header:

1. **AUTO toggle** — enable/disable automatic killing of idle dev servers.
2. **⚙ gear** — opens a side drawer with settings.

Each row has at most one button: `▸ KILL`. For protected processes the button
is replaced by `◈ LOCKED` — you literally cannot kill them by mistake.

### Kill behavior
- **Dev-range port + 0 connections** → click `KILL` = instant kill, no confirmation.
- **Outside dev range OR has open connections** → red modal asks for confirmation
  with the reason printed.
- **Protected process** → no button at all. Even if you craft an HTTP request
  to `/api/kill`, the server returns `403 protected`.

### Status meanings
- `ACTIVE`  — has open ESTABLISHED connections right now (someone is using it)
- `IDLE`    — listening, but the last activity (last connection or last conn-count change) was more than 60 seconds ago
- `LISTEN`  — recently started, no activity history yet
- `PROTECTED` — a system process or whitelisted port

### Auto mode
While AUTO is ON, every 60 seconds `portman` sweeps the registry. A process is
killed when **all** of these are true:
- it is **not** protected,
- its port is inside the **dev range** (default `3000–9999`),
- it has **0 open connections** at the moment,
- it has been idle for **≥ N minutes** (default `30`, set in the gear drawer).

System processes and ports outside the dev range are **never** touched by AUTO,
no matter what.

---

## Safety / Protected processes

Three layers of protection prevent accidental damage:

### 1. Hard-coded protected names

Defined in [`lib/server.js`](lib/server.js):
```
System, svchost.exe, lsass.exe, services.exe, wininit.exe,
spoolsv.exe, csrss.exe, smss.exe, winlogon.exe, explorer.exe,
dwm.exe, fontdrvhost.exe, mDNSResponder.exe, AcrylicService.exe,
AnyDesk.exe, TeamViewer_Service.exe, GoogleDriveFS.exe,
mysqld.exe, postgres.exe, redis-server.exe, mongod.exe,
vmware-authd.exe, vpnclient_x64.exe, sabycenter.exe,
ss_conn_service.exe, ss_conn_service2.exe, Spotify.exe,
Code.exe, cursor.exe, idea64.exe, pycharm64.exe, webstorm64.exe
```

### 2. Hard-coded protected ports

Anything below `1024` plus common service ports:
```
22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
1433, 3306, 5432, 6379, 8080, 8443, 27017, 5984, 9200, 11211
```

### 3. Custom whitelist

Add your own process names and ports through the **⚙ gear → Extra Protected
Names / Extra Protected Ports** fields. Saved to `~/.portman/settings.json`.

### Server-side enforcement
Even if a malicious script in your browser tries to POST to `/api/kill` with
a protected PID, the Node server re-checks the snapshot and returns
`403 { error: "protected", reason: "system" }`. **Don't** trust the front end —
the back end has the final say.

---

## CLI

After `npm link`:

```bash
portman ui                                # web UI (default)
portman ps                                # list processes in the terminal
portman kill 12345                        # kill by PID
portman kill :3000                        # kill the process listening on port 3000
portman kill idle                         # kill all registered idle processes
portman kill all                          # kill everything in the registry
portman run --label=mysite --port=3000 -- npm run dev
portman auto --interval=60 --idle=120     # CLI-only watcher
```

### `portman run` — wrap your dev server
```bash
portman run --label=mysite --port=3000 -- npm run dev
```
What it does:
1. Looks for previously registered processes with the same `label`, `cwd` or hint port.
2. **Kills idle ones automatically** (no open connections).
3. Leaves busy ones alone (prints a warning).
4. Registers the new process in `~/.portman/registry.json` so the UI shows the label,
   the cwd, the start time and the original command.

This is the cleanest way to use `portman` long-term: you get one dev server per
project, and starting a new one cleans up the previous one for free.

---

## State files

All state lives in `~/.portman/`:

| File | Purpose |
|---|---|
| `registry.json` | Processes registered through `portman run` |
| `activity.json` | Connection-history snapshots (used to compute `idle`) |
| `settings.json` | UI settings: AUTO state, idle threshold, port range, custom whitelists |

Plain JSON. Safe to edit by hand. Delete the folder to reset.

---

## How it works

- Every 3 seconds (UI) or 60 seconds (auto-sweep), `portman` runs `netstat -ano`
  and parses every `TCP LISTENING` and `TCP ESTABLISHED` line.
- For each PID it asks `tasklist` for the executable name, and `wmic` for the
  full command line (the latter only when registered through `portman run`).
- It compares the current ESTABLISHED count to the previous snapshot stored in
  `~/.portman/activity.json` to compute "last active at".
- Killing uses `taskkill /PID <pid> /T /F` (kills the process tree).

No native modules. No npm dependencies. ~600 lines of plain Node.js.

---

## Known limitations

- **Windows only.** Uses `netstat -ano`, `tasklist`, `wmic`, `taskkill` —
  PRs to support Linux/macOS would need to abstract these. (PRs are not
  accepted; see [CONTRIBUTING.md](CONTRIBUTING.md). Fork freely.)
- `wmic` is deprecated on Windows 11 24H2+ but still ships by default. If
  Microsoft removes it, `portman run` will lose command-line metadata for
  pre-existing processes — the rest still works.
- Activity history is per-PID. If a process restarts and gets a new PID, its
  history starts over.

---

## Roadmap

- [ ] Pack into a single `.exe` via `pkg` or `bun build --compile` so users
      don't need Node.
- [ ] System tray icon (start/stop/show via right-click menu).
- [ ] Run on user login (Task Scheduler entry).
- [ ] Optional dark/light theme variants of the CRT skin (amber, blue).
- [ ] Per-project rules (e.g. "kill `mysite` after 10 min idle, but never `bigsim`").

---

## Why does Windows warn me about `portman.exe`?

**TL;DR:** the binary isn't code-signed (yet), so Windows SmartScreen shows a yellow warning the first time you run it. Click **More info → Run anyway**. That's it.

### Detailed explanation

Microsoft's SmartScreen filter blocks any executable that:
- isn't signed by a paid Code Signing certificate ($300–$700/year), **and**
- doesn't yet have established "reputation" (≈ thousands of downloads with zero malware reports).

`portman.exe` is open-source (MIT), built locally from this repo via `@yao-pkg/pkg`, and contains no telemetry, no auto-updater, and no network calls beyond `127.0.0.1`. The full source you can audit is right here in this repo — `bin/`, `lib/`, `web/`. The build command is one line in `package.json`: `npm run build`.

### How to verify the .exe matches what you see in this repo

Each release lists a SHA-256 hash. Verify before running:

```powershell
Get-FileHash portman.exe -Algorithm SHA256
```

Compare with the hash in the release notes:
- [v0.5.0](https://github.com/al-nemirov/portman/releases/tag/v0.5.0): `840f8a3c8b066337916dc44adccd248f8e9db65e506170bf06c107f07de01bbd`
- [v0.4.0](https://github.com/al-nemirov/portman/releases/tag/v0.4.0): `68687ec2f9bce2bbf28b144d1411b90a59cfee0db5e609e98d21300b660a66d4`
- [v0.3.1](https://github.com/al-nemirov/portman/releases/tag/v0.3.1): `659bdc33ace119bf9b147e233ffba56ea9076d5b1589293bbb222eb984aa2bf1`

### Or: build it yourself

```powershell
git clone https://github.com/al-nemirov/portman.git
cd portman
npm install
npm run build
.\dist\portman.exe ui
```
Now you know exactly what's inside.

### When will the warning go away?

- After ~1000–10000 downloads with no malware reports, SmartScreen builds reputation for the file hash and stops warning automatically.
- Or when this project gets accepted into [SignPath.io Foundation](https://about.signpath.io/foundation/) — free EV code signing for OSS projects with proven traction.

## License

[MIT](LICENSE) © Alexander Nemirov

## Contributing

Sole maintainer: [@al-nemirov](https://github.com/al-nemirov).
**Pull requests are not accepted.** See [CONTRIBUTING.md](CONTRIBUTING.md).
Fork freely under the MIT license.
