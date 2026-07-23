@echo off
echo =========================================
echo   Smart Flipbook - Local Dev Server (legacy)
echo =========================================
echo.
echo Server berjalan di: http://localhost:8080
echo Tekan Ctrl+C untuk berhenti.
echo.
cd /d "%~dp0legacy"
start "" http://localhost:8080
python -m http.server 8080
pause
