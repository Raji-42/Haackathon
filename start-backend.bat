@echo off
title CertiFlow Backend Server (Port 5000)
cd /d "%~dp0backend"
echo ===================================================
echo Starting CertiFlow Backend Server...
echo ===================================================
node dist/server.js
pause
