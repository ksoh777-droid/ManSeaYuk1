@echo off
chcp 65001 > nul
title 사주 조회 프로그램
cd /d "%~dp0"

set "NODE=node"
where node >nul 2>nul || set "NODE=%ProgramFiles%\nodejs\node.exe"

"%NODE%" saju.mjs %*

echo.
pause
