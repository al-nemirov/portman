@echo off
rem === Создаёт ярлык PORTMAN на рабочем столе ===
rem Двойной клик по этому файлу — и на рабочем столе появится "PORTMAN"
rem с зелёной иконкой консоли. Запускается тихо, без окна.

set SCRIPT_DIR=%~dp0
set TARGET=%SCRIPT_DIR%portman-silent.vbs
set ICON=%SystemRoot%\System32\shell32.dll,25

powershell -NoProfile -ExecutionPolicy Bypass -Command ^
  "$s = (New-Object -ComObject WScript.Shell).CreateShortcut([Environment]::GetFolderPath('Desktop') + '\PORTMAN.lnk');" ^
  "$s.TargetPath = '%TARGET%';" ^
  "$s.WorkingDirectory = '%SCRIPT_DIR%';" ^
  "$s.IconLocation = '%ICON%';" ^
  "$s.Description = 'Диспетчер локальных портов';" ^
  "$s.Save()"

if %ERRORLEVEL% EQU 0 (
  echo.
  echo [OK] Ярлык PORTMAN создан на рабочем столе.
) else (
  echo.
  echo [FAIL] Не удалось создать ярлык.
)
echo.
pause
