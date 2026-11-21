@echo off
title CertiFlow Frontend UI (Port 5173)
cd /d "%~dp0frontend"
echo ===================================================
echo Starting CertiFlow Frontend Web App...
echo ===================================================
node node_modules/vite/bin/vite.js --host 0.0.0.0 --port 5173
pause
