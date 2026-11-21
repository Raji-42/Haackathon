@echo off
title CertiFlow Starter
echo ===================================================
echo Launching CertiFlow Full Stack Application...
echo ===================================================
start "CertiFlow Backend" cmd /k "%~dp0start-backend.bat"
start "CertiFlow Frontend" cmd /k "%~dp0start-frontend.bat"
echo Servers are launching!
echo Frontend will be ready at: http://localhost:5173
echo Backend will be ready at:  http://localhost:5000
timeout /t 3 >nul
start http://localhost:5173
