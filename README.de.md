<p align="center">
  <img src="logo.png" alt="PORTMAN" width="180">
</p>

<h1 align="center">PORTMAN</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <b>Deutsch</b> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  Retro CRT-Stil Windows-Dispatcher für lokale Dev-Server.<br>
  Sehen, was lauscht, was leerläuft, Duplikate töten, abgestandene<br>
  Dev-Server automatisch aufräumen. Ein-Klick-Desktop-Launcher.<br>
  UI in EN / KO / DE / ES.
</p>

[![Platform](https://img.shields.io/badge/platform-Windows-0a84ff)](https://github.com/al-nemirov/portman)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Warum

Wenn du täglich zwischen Next.js, Vite, Astro, Express, Python-Servern und PHP
hin- und herspringst, sammelst du **einen Friedhof vergessener `npm run dev`-Prozesse**,
die still RAM fressen und Ports belegen. Der Windows-Task-Manager hilft nicht —
er zeigt zehn Mal `node.exe` ohne Hinweis darauf, welcher zu welchem Projekt gehört.

`portman` löst genau das:

- Ein Bildschirm zeigt **jeden TCP-LISTEN-Prozess** auf deiner Maschine, gruppiert
  und farbcodiert.
- Sagt dir, **welche tatsächlich genutzt werden** (offene Verbindungen) und welche
  **leerlaufen** (lauschen, aber niemand spricht mit ihnen).
- Ein Klick zum **Töten** eines leerlaufenden Dev-Servers. Systemprozesse sind
  physisch nicht klickbar.
- Ein optionaler **Auto-Modus** wischt leerlaufende Dev-Server älter als N Minuten —
  einstellen und vergessen.
- Der Wrapper-Befehl `portman run -- npm run dev` registriert deinen Dev-Server
  mit einem Label und **tötet die vorherige Instanz desselben Projekts automatisch**
  beim Start einer neuen.
- **Live-RAM und -CPU pro Prozess** — sortiere nach RAM ↓, um den Dev-Server
  zu finden, der heimlich 2 GB frisst.
- **Klickbare `localhost:PORT`-Links** — öffne jeden Dev-Server in einem neuen Tab
  direkt aus der Tabelle.
- **Filter-Chips** (ALL / DEV / ACTIVE / IDLE / PROTECTED) und **Sofort-Suche**
  nach PID / Name / Port / Label / Befehl.

## Screenshots

Das UI ist absichtlich retro: Phosphor-grünes CRT, Scanlines, gepunktete Ränder,
ein einzelner großer AUTO-Schalter. Keine Menüs. Keine Tabs. Keine unnötigen Modale.

```
▎PORTMAN        PROC 26   IDLE 4   PROT 23      [● AUTO · AN]   [⚙]

PID    NAME              PORTS           CONN  STATUS    AGE · IDLE     ACTION
◈ 4    System            445 5357 139    0     PROTECTED — · —          ◈ LOCKED
◆ 4152 php.exe           8000            0     IDLE      — · 12m        ▸ KILL
● 9234 [moandanang] node 3000            2     ACTIVE    47m · 2s       ▸ KILL
◆ 7710 node.exe          5173            0     IDLE      — · 38m        ▸ KILL
◈ 6428 mysqld.exe        3306            0     PROTECTED — · —          ◈ LOCKED
```

Legende:
- `●` über `portman run` registriert (du weißt, was es ist)
- `◆` unbekannt, aber im Dev-Port-Bereich (3000–9999)
- `◈` Systemprozess — gesperrt, KILL-Button ausgeblendet

---

## Installation

### Voraussetzungen
- **Windows 10 oder 11**
- **Node.js ≥ 18** ([nodejs.org](https://nodejs.org))

### Code holen
```powershell
git clone https://github.com/al-nemirov/portman.git C:\Tools\portman
cd C:\Tools\portman
```
(Kein `npm install` nötig — null Abhängigkeiten)

### Global verfügbar machen (optional)
```powershell
npm link
```
Danach kannst du `portman` von überall eingeben.

---

## Ausführen

### Ein-Klick-Start (empfohlen)

Doppelklicke einmal **`install-shortcut.bat`** — es erstellt ein `PORTMAN.lnk`-Symbol
auf deinem Desktop. Danach Doppelklick auf das Desktop-Symbol zum Starten. Der Server
läuft still im Hintergrund; dein Standardbrowser öffnet
[http://127.0.0.1:9876](http://127.0.0.1:9876).

Du kannst die Verknüpfung ins Startmenü ziehen oder an die Taskleiste anheften.

### Andere Startoptionen

| Datei / Befehl | Was es macht |
|---|---|
| `portman.bat` | Mit **Konsolenfenster** ausführen (Logs sichtbar, mit `Ctrl+C` stoppen) |
| `portman-silent.vbs` | Still im Hintergrund, kein Fenster |
| `portman ui` | Dasselbe (nach `npm link`) |
| `portman ui --port=9000` | Eigener UI-Port |
| `portman ui --no-open` | Browser nicht automatisch öffnen |

---

## Web-UI

Besuche [http://127.0.0.1:9876](http://127.0.0.1:9876).

Die Tabelle aktualisiert sich alle 3 Sekunden. Es gibt **nur zwei Steuerelemente** im Header:

1. **AUTO-Schalter** — automatisches Töten leerlaufender Dev-Server an/aus.
2. **⚙ Zahnrad** — öffnet eine Seitenschublade mit Einstellungen.

Jede Zeile hat höchstens einen Button: `▸ KILL`. Für geschützte Prozesse wird der
Button durch `◈ LOCKED` ersetzt — du kannst sie buchstäblich nicht versehentlich töten.

### Töten-Verhalten
- **Dev-Bereich-Port + 0 Verbindungen** → `KILL` klicken = sofortiges Töten ohne Bestätigung.
- **Außerhalb des Dev-Bereichs ODER mit offenen Verbindungen** → rotes Modal fragt
  nach Bestätigung mit ausgedrucktem Grund.
- **Geschützter Prozess** → kein Button überhaupt. Selbst wenn du eine HTTP-Anfrage
  an `/api/kill` bastelst, gibt der Server `403 protected` zurück.

### Status-Bedeutungen
- `ACTIVE`  — hat gerade offene ESTABLISHED-Verbindungen (jemand nutzt es)
- `IDLE`    — lauscht, aber letzte Aktivität war vor mehr als 60 Sekunden
- `LISTEN`  — kürzlich gestartet, noch keine Aktivitätshistorie
- `PROTECTED` — Systemprozess oder Whitelist-Port

### Auto-Modus
Während AUTO AN ist, wischt `portman` alle 60 Sekunden die Registry. Ein Prozess
wird getötet, wenn **alle** dieser Bedingungen wahr sind:
- er ist **nicht** geschützt,
- sein Port liegt im **Dev-Bereich** (Standard `3000–9999`),
- er hat im Moment **0 offene Verbindungen**,
- er war für **≥ N Minuten** im Leerlauf (Standard `30`, in der Zahnrad-Schublade einstellen).

Systemprozesse und Ports außerhalb des Dev-Bereichs werden **niemals** vom AUTO
berührt, egal was.

---

## Sicherheit / Geschützte Prozesse

Drei Schutzschichten verhindern versehentliche Schäden:

### 1. Hartcodierte geschützte Namen

Definiert in [`lib/server.js`](lib/server.js):
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

### 2. Hartcodierte geschützte Ports

Alles unter `1024` plus gängige Service-Ports:
```
22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
1433, 3306, 5432, 6379, 8080, 8443, 27017, 5984, 9200, 11211
```

### 3. Eigene Whitelist

Eigene Prozessnamen und Ports über die **⚙ Zahnrad → Zusatz geschützte Namen /
Zusatz geschützte Ports**-Felder hinzufügen. Gespeichert in `~/.portman/settings.json`.

### Server-seitige Durchsetzung
Selbst wenn ein bösartiges Skript in deinem Browser versucht, an `/api/kill` mit
einer geschützten PID zu POSTen, prüft der Node-Server den Snapshot erneut und
gibt `403 { error: "protected", reason: "system" }` zurück. **Vertraue dem Frontend
nicht** — das Backend hat das letzte Wort.

---

## CLI

Nach `npm link`:

```bash
portman ui                                # Web-UI (Standard)
portman ps                                # Prozessliste im Terminal
portman kill 12345                        # Nach PID töten
portman kill :3000                        # Prozess auf Port 3000 töten
portman kill idle                         # Alle registrierten leerlaufenden Prozesse töten
portman kill all                          # Alles in der Registry töten
portman run --label=mysite --port=3000 -- npm run dev
portman auto --interval=60 --idle=120     # CLI-only Watcher
```

### `portman run` — Dev-Server umhüllen
```bash
portman run --label=mysite --port=3000 -- npm run dev
```
Was es tut:
1. Sucht nach zuvor registrierten Prozessen mit demselben `label`, `cwd` oder Hinweis-Port.
2. **Tötet leerlaufende automatisch** (keine offenen Verbindungen).
3. Lässt beschäftigte in Ruhe (gibt eine Warnung aus).
4. Registriert den neuen Prozess in `~/.portman/registry.json`, sodass das UI das Label,
   den cwd, die Startzeit und den ursprünglichen Befehl anzeigt.

Dies ist der sauberste Weg, `portman` langfristig zu nutzen: du bekommst einen
Dev-Server pro Projekt, und das Starten eines neuen räumt den vorherigen kostenlos auf.

---

## Zustandsdateien

Aller Zustand lebt in `~/.portman/`:

| Datei | Zweck |
|---|---|
| `registry.json` | Prozesse, registriert über `portman run` |
| `activity.json` | Verbindungs-Historie-Snapshots (zur Berechnung von `idle`) |
| `settings.json` | UI-Einstellungen: AUTO-Status, Leerlauf-Schwelle, Port-Bereich, eigene Whitelists |

Plain JSON. Sicher per Hand zu bearbeiten. Ordner löschen zum Zurücksetzen.

---

## Lizenz

[MIT](LICENSE) © Alexander Nemirov

## Mitwirken

Alleiniger Maintainer: [@al-nemirov](https://github.com/al-nemirov).
**Pull Requests werden nicht akzeptiert.** Siehe [CONTRIBUTING.md](CONTRIBUTING.md).
Forke frei unter MIT-Lizenz.
