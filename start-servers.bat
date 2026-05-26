@echo off
echo Backend sunucusu başlatılıyor (Port 3000)...
start cmd /k "cd backend && node server.js"

timeout /t 2

echo Frontend sunucusu başlatılıyor (Port 5500)...
start cmd /k "cd frodent && node server.js"

echo.
echo Backend: http://localhost:3000
echo Frontend: http://localhost:5500
echo.
pause
