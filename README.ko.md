<p align="center">
  <img src="logo.png" alt="PORTMAN" width="180">
</p>

<h1 align="center">PORTMAN</h1>

<p align="center">
  <a href="README.md">English</a> ·
  <b>한국어</b> ·
  <a href="README.de.md">Deutsch</a> ·
  <a href="README.es.md">Español</a>
</p>

<p align="center">
  로컬호스트 개발 서버를 위한 복고풍 CRT 스타일 Windows 디스패처.<br>
  어떤 프로세스가 수신 중인지, 어떤 것이 유휴 상태인지 확인하고,<br>
  중복을 종료하고 오래된 개발 서버를 자동으로 정리합니다.<br>
  원클릭 데스크탑 런처. UI는 EN / KO / DE / ES 지원.
</p>

[![Platform](https://img.shields.io/badge/platform-Windows-0a84ff)](https://github.com/al-nemirov/portman)
[![Node](https://img.shields.io/badge/node-%3E%3D18-339933)](https://nodejs.org)
[![License](https://img.shields.io/badge/license-MIT-green)](LICENSE)

---

## 왜 필요한가?

Next.js, Vite, Astro, Express, Python, PHP 내장 서버 등을 오가며 작업하다 보면
**버려진 `npm run dev` 프로세스들의 무덤**이 쌓여 RAM과 포트를 조용히 차지합니다.
Windows 작업 관리자는 도움이 안 됩니다 — `node.exe`가 10개 보이는데 어떤 게
어떤 프로젝트인지 알 수 없습니다.

`portman`은 바로 이 문제를 해결합니다:

- 한 화면에서 **시스템의 모든 TCP LISTEN 프로세스**를 그룹화하여 색상으로 표시.
- **어떤 것이 실제로 사용 중**(열린 연결이 있음)이고 어떤 것이 **유휴 상태**인지 알려줌.
- 유휴 개발 서버를 **한 번의 클릭으로 종료**. 시스템 프로세스는 물리적으로 클릭 불가능.
- **자동 모드**는 N분 이상 유휴 상태인 개발 서버를 정리 — 설정하고 잊어버리세요.
- 래퍼 명령 `portman run -- npm run dev`는 프로젝트에 라벨을 붙여 등록하고,
  같은 프로젝트의 새 인스턴스를 시작할 때 **이전 인스턴스를 자동으로 종료**합니다.
- **프로세스별 실시간 RAM/CPU** — RAM ↓로 정렬해서 몰래 2GB를 먹는 dev 서버를 찾으세요.
- **클릭 가능한 `localhost:PORT` 링크** — 표에서 바로 새 탭으로 dev 서버 열기.
- **필터 칩** (ALL / DEV / ACTIVE / IDLE / PROTECTED) 및 PID / 이름 / 포트 /
  라벨 / 명령으로 **즉시 검색**.

## 스크린샷

UI는 의도적으로 복고풍입니다: 형광 녹색 CRT, 주사선, 점선 테두리,
하나의 큰 AUTO 토글. 메뉴 없음. 탭 없음. 불필요한 모달 없음.

```
▎PORTMAN        PROC 26   IDLE 4   PROT 23      [● AUTO · ON]   [⚙]

PID    NAME              PORTS           CONN  STATUS    AGE · IDLE     ACTION
◈ 4    System            445 5357 139    0     PROTECTED — · —          ◈ LOCKED
◆ 4152 php.exe           8000            0     IDLE      — · 12m        ▸ KILL
● 9234 [moandanang] node 3000            2     ACTIVE    47m · 2s       ▸ KILL
◆ 7710 node.exe          5173            0     IDLE      — · 38m        ▸ KILL
◈ 6428 mysqld.exe        3306            0     PROTECTED — · —          ◈ LOCKED
```

범례:
- `●` `portman run`으로 등록됨 (정체를 알고 있음)
- `◆` 알 수 없지만 개발 포트 범위(3000–9999) 내
- `◈` 시스템 프로세스 — 잠김, KILL 버튼 숨김

---

## 설치

### 전제 조건
- **Windows 10 또는 11**
- **Node.js ≥ 18** ([nodejs.org](https://nodejs.org))

### 코드 받기
```powershell
git clone https://github.com/al-nemirov/portman.git C:\Tools\portman
cd C:\Tools\portman
```
(`npm install` 불필요 — 의존성 없음)

### 전역 설치 (선택)
```powershell
npm link
```
이후 어디서나 `portman`을 입력할 수 있습니다.

---

## 실행

### 원클릭 실행 (권장)

**`install-shortcut.bat`**을 한 번 더블클릭하세요. 바탕화면에 `PORTMAN.lnk`
아이콘이 생성됩니다. 그 후 바탕화면 아이콘을 더블클릭하면 서버가 백그라운드에서
조용히 실행되고 기본 브라우저에서 [http://127.0.0.1:9876](http://127.0.0.1:9876)이 열립니다.

바로가기를 시작 메뉴에 드래그하거나 작업 표시줄에 고정할 수 있습니다.

### 다른 실행 방법

| 파일 / 명령 | 동작 |
|---|---|
| `portman.bat` | **콘솔 창과 함께** 실행 (로그 보임, `Ctrl+C`로 중지) |
| `portman-silent.vbs` | 창 없이 백그라운드에서 조용히 실행 |
| `portman ui` | 동일 (`npm link` 후) |
| `portman ui --port=9000` | 사용자 지정 UI 포트 |
| `portman ui --no-open` | 브라우저 자동 열기 비활성화 |

---

## 웹 UI

[http://127.0.0.1:9876](http://127.0.0.1:9876) 방문.

테이블은 3초마다 새로 고침됩니다. 헤더에는 **단 두 개의 컨트롤**:

1. **AUTO 토글** — 유휴 개발 서버 자동 종료 활성화/비활성화.
2. **⚙ 기어** — 설정이 있는 사이드 드로어 열기.

각 행에는 최대 하나의 버튼: `▸ KILL`. 보호된 프로세스의 경우 버튼 대신
`◈ LOCKED`가 표시됩니다 — 실수로 종료할 수 없습니다.

### 종료 동작
- **개발 범위 포트 + 0 연결** → `KILL` 클릭 = 즉시 종료, 확인 없음.
- **개발 범위 외 또는 열린 연결 있음** → 빨간 모달이 이유와 함께 확인 요청.
- **보호된 프로세스** → 버튼 자체가 없음. `/api/kill`에 HTTP 요청을
  조작해도 서버가 `403 protected`를 반환.

### 상태 의미
- `ACTIVE` — 지금 열린 ESTABLISHED 연결 있음 (누군가 사용 중)
- `IDLE` — 수신 중이지만 마지막 활동이 60초 이상 경과
- `LISTEN` — 최근 시작됨, 활동 이력 아직 없음
- `PROTECTED` — 시스템 프로세스 또는 화이트리스트 포트

### 자동 모드
AUTO가 ON인 동안 `portman`은 60초마다 레지스트리를 스윕합니다. 프로세스는
**모든** 조건이 참일 때 종료됩니다:
- 보호되지 **않음**,
- 포트가 **개발 범위** 내 (기본 `3000–9999`),
- 현재 열린 연결이 **0개**,
- **N분 이상** 유휴 상태 (기본 `30`, 기어 드로어에서 설정).

시스템 프로세스와 개발 범위 외의 포트는 AUTO가 **절대** 건드리지 않습니다.

---

## 안전 / 보호된 프로세스

우발적 손상을 방지하는 3계층 보호:

### 1. 하드코딩된 보호 이름

[`lib/server.js`](lib/server.js)에 정의:
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

### 2. 하드코딩된 보호 포트

`1024` 미만의 모든 것 + 일반 서비스 포트:
```
22, 25, 53, 80, 110, 135, 139, 143, 443, 445, 465, 587, 993, 995,
1433, 3306, 5432, 6379, 8080, 8443, 27017, 5984, 9200, 11211
```

### 3. 사용자 정의 화이트리스트

**⚙ 기어 → 추가 보호 이름 / 추가 보호 포트** 필드를 통해 자체 프로세스 이름과
포트를 추가합니다. `~/.portman/settings.json`에 저장됩니다.

### 서버 측 강제
브라우저의 악의적 스크립트가 보호된 PID로 `/api/kill`에 POST하려고 해도
Node 서버가 스냅샷을 재확인하고 `403 { error: "protected", reason: "system" }`을
반환합니다. 프런트엔드를 **신뢰하지 마세요** — 백엔드가 최종 결정권자입니다.

---

## CLI

`npm link` 후:

```bash
portman ui                                # 웹 UI (기본)
portman ps                                # 터미널에서 프로세스 목록
portman kill 12345                        # PID로 종료
portman kill :3000                        # 포트 3000에서 수신 중인 프로세스 종료
portman kill idle                         # 등록된 모든 유휴 프로세스 종료
portman kill all                          # 레지스트리의 모든 항목 종료
portman run --label=mysite --port=3000 -- npm run dev
portman auto --interval=60 --idle=120     # CLI 전용 watcher
```

### `portman run` — 개발 서버 래핑
```bash
portman run --label=mysite --port=3000 -- npm run dev
```
동작:
1. 동일한 `label`, `cwd` 또는 힌트 포트로 이전에 등록된 프로세스 찾기.
2. 유휴 상태인 것들을 **자동으로 종료** (열린 연결 없음).
3. 사용 중인 것들은 그대로 두고 경고 출력.
4. 새 프로세스를 `~/.portman/registry.json`에 등록하여 UI에 라벨, cwd,
   시작 시간 및 원래 명령을 표시합니다.

장기적으로 `portman`을 사용하는 가장 깔끔한 방법: 프로젝트당 하나의 개발 서버를
얻고 새 서버를 시작하면 이전 서버가 무료로 정리됩니다.

---

## 상태 파일

모든 상태는 `~/.portman/`에 저장됩니다:

| 파일 | 용도 |
|---|---|
| `registry.json` | `portman run`으로 등록된 프로세스 |
| `activity.json` | 연결 이력 스냅샷 (`idle` 계산용) |
| `settings.json` | UI 설정: AUTO 상태, 유휴 임계값, 포트 범위, 사용자 화이트리스트 |

평문 JSON. 수동 편집 안전. 폴더를 삭제하면 초기화.

---

## SmartScreen 경고에 대해

`portman.exe`는 코드 서명이 되어있지 않습니다 (아직 — 코드 서명 인증서는 연 $300+). 처음 실행 시 Windows가 노란색 경고를 표시합니다. **자세히 → 실행**을 클릭하세요.

바이너리가 이 저장소의 소스와 일치하는지 확인하려면:
```powershell
Get-FileHash portman.exe -Algorithm SHA256
```
릴리스 노트의 해시와 비교하세요. 또는 직접 빌드: `npm install && npm run build`.

전체 설명: [English README — SmartScreen FAQ](README.md#why-does-windows-warn-me-about-portmanexe).

## 라이선스

[MIT](LICENSE) © Alexander Nemirov

## 기여

단독 관리자: [@al-nemirov](https://github.com/al-nemirov).
**Pull request는 받지 않습니다.** [CONTRIBUTING.md](CONTRIBUTING.md) 참조.
MIT 라이선스 하에 자유롭게 포크하세요.
