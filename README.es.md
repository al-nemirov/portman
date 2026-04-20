<p align="center">
  <img src="logo.png" alt="PORTMAN" width="180">
</p>

<h1 align="center">PORTMAN</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <a href="README.ko.md">한국어</a> ·
  <a href="README.de.md">Deutsch</a> ·
  <b>Español</b>
</p>

<p align="center">
  Despachador de servidores de desarrollo localhost para Windows con estilo CRT retro.<br>
  Ve qué está escuchando, qué está inactivo, mata duplicados,<br>
  limpia automáticamente servidores de desarrollo obsoletos.<br>
  Lanzador de escritorio con un solo clic. UI en EN / KO / DE / ES.
</p>

[![Platform](https://img.shields.io/badge/platform-Windows-0a84ff)](https://github.com/al-nemirov/portman)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## Por qué

Si pasas el día saltando entre Next.js, Vite, Astro, Express, servidores Python
y servidores PHP integrados, terminas con **un cementerio de procesos `npm run dev`
olvidados** que silenciosamente consumen RAM y retienen puertos. El Administrador
de Tareas de Windows no ayuda — muestra `node.exe` diez veces sin pista de cuál
es qué proyecto.

`portman` resuelve exactamente eso:

- Una pantalla muestra **cada proceso TCP LISTEN** en tu máquina, agrupado y
  codificado por colores.
- Te dice **cuáles están realmente en uso** (con conexiones abiertas) y cuáles
  están **inactivos** (escuchando pero nadie habla con ellos).
- Un clic para **matar** un servidor de desarrollo inactivo. Los procesos del
  sistema son físicamente no clicables.
- Un **modo automático** opcional barre los servidores de desarrollo inactivos
  más antiguos que N minutos — configúralo y olvídalo.
- Un comando wrapper `portman run -- npm run dev` registra tu servidor de
  desarrollo con una etiqueta y **mata automáticamente la instancia anterior**
  del mismo proyecto cuando inicias una nueva.
- **RAM y CPU en vivo por proceso** — ordena por RAM ↓ para encontrar el
  servidor de desarrollo que está secretamente comiendo 2 GB.
- **Enlaces `localhost:PORT` clicables** — abre cualquier servidor de desarrollo
  en una nueva pestaña directamente desde la tabla.
- **Chips de filtro** (ALL / DEV / ACTIVE / IDLE / PROTECTED) y **búsqueda
  instantánea** por PID / nombre / puerto / etiqueta / comando.

## Capturas de pantalla

La interfaz es intencionalmente retro: CRT verde fósforo, líneas de escaneo,
bordes punteados, un solo gran interruptor AUTO. Sin menús. Sin pestañas.
Sin modales innecesarios.

```
▎PORTMAN        PROC 26   IDLE 4   PROT 23      [● AUTO · ON]   [⚙]

PID    NAME              PORTS           CONN  STATUS    AGE · IDLE     ACTION
◈ 4    System            445 5357 139    0     PROTECTED — · —          ◈ LOCKED
◆ 4152 php.exe           8000            0     IDLE      — · 12m        ▸ KILL
● 9234 [moandanang] node 3000            2     ACTIVE    47m · 2s       ▸ KILL
◆ 7710 node.exe          5173            0     IDLE      — · 38m        ▸ KILL
◈ 6428 mysqld.exe        3306            0     PROTECTED — · —          ◈ LOCKED
```

Leyenda:
- `●` registrado a través de `portman run` (sabes qué es)
- `◆` desconocido pero dentro del rango de puertos dev (3000–9999)
- `◈` proceso del sistema — bloqueado, botón KILL oculto

---

## Instalación

### Requisitos previos
- **Windows 10 u 11**
- **Node.js ≥ 18** ([nodejs.org](https://nodejs.org))

### Obtener el código
```powershell
git clone https://github.com/al-nemirov/portman.git C:\Tools\portman
cd C:\Tools\portman
```
(no se necesita `npm install` — cero dependencias)

### Hacerlo global (opcional)
```powershell
npm link
```
Después de esto puedes escribir `portman` desde cualquier lugar.

---

## Ejecutar

### Lanzamiento con un clic (recomendado)

Haz doble clic en **`install-shortcut.bat`** una vez — crea un icono `PORTMAN.lnk`
en tu Escritorio. Después, doble clic en el icono del escritorio para iniciar.
El servidor se ejecuta silenciosamente en segundo plano; tu navegador
predeterminado abre [http://127.0.0.1:9876](http://127.0.0.1:9876).

Puedes arrastrar el acceso directo al menú Inicio o anclarlo a la barra de tareas.

### Otras opciones de lanzamiento

| Archivo / comando | Qué hace |
|---|---|
| `portman.bat` | Ejecuta **con ventana de consola** (logs visibles, fácil de detener con `Ctrl+C`) |
| `portman-silent.vbs` | Ejecuta silenciosamente en segundo plano, sin ventana |
| `portman ui` | Lo mismo (después de `npm link`) |
| `portman ui --port=9000` | Puerto UI personalizado |
| `portman ui --no-open` | No auto-abre el navegador |

---

## UI Web

Visita [http://127.0.0.1:9876](http://127.0.0.1:9876).

La tabla se actualiza cada 3 segundos. Hay **solo dos controles** en el encabezado:

1. **Interruptor AUTO** — habilitar/deshabilitar la matanza automática de
   servidores de desarrollo inactivos.
2. **⚙ engranaje** — abre un cajón lateral con configuración.

Cada fila tiene como máximo un botón: `▸ KILL`. Para procesos protegidos el
botón es reemplazado por `◈ LOCKED` — literalmente no puedes matarlos por error.

### Comportamiento de matar
- **Puerto en rango dev + 0 conexiones** → clic `KILL` = matanza instantánea, sin confirmación.
- **Fuera del rango dev O con conexiones abiertas** → modal rojo pide confirmación
  con la razón impresa.
- **Proceso protegido** → no hay botón en absoluto. Incluso si fabricas una
  petición HTTP a `/api/kill`, el servidor devuelve `403 protected`.

### Significado de los estados
- `ACTIVE` — tiene conexiones ESTABLISHED abiertas ahora mismo (alguien lo está usando)
- `IDLE` — escuchando, pero la última actividad fue hace más de 60 segundos
- `LISTEN` — recientemente iniciado, sin historial de actividad aún
- `PROTECTED` — un proceso del sistema o puerto en lista blanca

### Modo automático
Mientras AUTO está ON, cada 60 segundos `portman` barre el registro. Un proceso
se mata cuando **todas** estas condiciones son verdaderas:
- **no** está protegido,
- su puerto está dentro del **rango dev** (por defecto `3000–9999`),
- tiene **0 conexiones abiertas** en este momento,
- ha estado inactivo durante **≥ N minutos** (por defecto `30`, configurable en
  el cajón del engranaje).

Los procesos del sistema y los puertos fuera del rango dev **nunca** son tocados
por AUTO, sin importar qué.

---

## Seguridad / Procesos protegidos

Tres capas de protección previenen daños accidentales:

### 1. Nombres protegidos hardcodeados

Definidos en [`lib/server.js`](lib/server.js):
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

### 2. Puertos protegidos hardcodeados

Cualquier cosa por debajo de `1024` más puertos de servicio comunes:
```
22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
1433, 3306, 5432, 6379, 8080, 8443, 27017, 5984, 9200, 11211
```

### 3. Lista blanca personalizada

Añade tus propios nombres de procesos y puertos a través de los campos
**⚙ engranaje → Nombres protegidos extra / Puertos protegidos extra**.
Guardado en `~/.portman/settings.json`.

### Aplicación del lado del servidor
Incluso si un script malicioso en tu navegador intenta hacer POST a `/api/kill`
con un PID protegido, el servidor Node vuelve a verificar la instantánea y
devuelve `403 { error: "protected", reason: "system" }`. **No** confíes en el
front end — el back end tiene la última palabra.

---

## CLI

Después de `npm link`:

```bash
portman ui                                # UI web (por defecto)
portman ps                                # listar procesos en la terminal
portman kill 12345                        # matar por PID
portman kill :3000                        # matar el proceso escuchando en el puerto 3000
portman kill idle                         # matar todos los procesos inactivos registrados
portman kill all                          # matar todo en el registro
portman run --label=mysite --port=3000 -- npm run dev
portman auto --interval=60 --idle=120     # watcher solo CLI
```

### `portman run` — envuelve tu servidor de desarrollo
```bash
portman run --label=mysite --port=3000 -- npm run dev
```
Lo que hace:
1. Busca procesos previamente registrados con el mismo `label`, `cwd` o puerto sugerido.
2. **Mata los inactivos automáticamente** (sin conexiones abiertas).
3. Deja en paz los ocupados (imprime una advertencia).
4. Registra el nuevo proceso en `~/.portman/registry.json` para que la UI muestre
   la etiqueta, el cwd, la hora de inicio y el comando original.

Esta es la forma más limpia de usar `portman` a largo plazo: obtienes un servidor
de desarrollo por proyecto, e iniciar uno nuevo limpia el anterior gratis.

---

## Archivos de estado

Todo el estado vive en `~/.portman/`:

| Archivo | Propósito |
|---|---|
| `registry.json` | Procesos registrados a través de `portman run` |
| `activity.json` | Instantáneas del historial de conexiones (usado para calcular `idle`) |
| `settings.json` | Configuración de UI: estado AUTO, umbral inactivo, rango de puertos, listas blancas personalizadas |

JSON simple. Seguro de editar a mano. Borra la carpeta para resetear.

---

## Licencia

[MIT](LICENSE) © Alexander Nemirov

## Contribuir

Único mantenedor: [@al-nemirov](https://github.com/al-nemirov).
**Los Pull Requests no son aceptados.** Ver [CONTRIBUTING.md](CONTRIBUTING.md).
Forkea libremente bajo la licencia MIT.
