@echo off
rem === PORTMAN — запуск с консолью (видны логи) ===
title PORTMAN
cd /d "%~dp0"
node bin\portman.js ui
pause
