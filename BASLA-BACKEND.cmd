@echo off
title ItemCI Backend Setup & Start
chcp 65001 > nul
cls
echo ===============================================
echo ItemCI - Backend Kurulum ve Başlatma
echo ===============================================
echo.
echo [1/3] Node.js Versiyonu Kontrol Ediliyor...
node --version
npm --version
echo.
echo [2/3] NPM Dependencies Kontrol Ediliyor...
cd /d c:\Users\Zımbacı\Desktop\itemci-project
if exist node_modules (
    echo Dependencies zaten yüklü.
) else (
    echo Dependencies yükleniyor...
    npm install
)
echo.
echo [3/3] MongoDB Kontrol Ediliyor...
netstat -ano | findstr :27017 > nul 2>&1
if %errorlevel% equ 0 (
    echo MongoDB çalışıyor.
) else (
    echo UYARI: MongoDB sunucusu çalışmıyor olabilir.
    echo MongoDB'yi başlatmak için: mongod
)
echo.
echo ===============================================
echo Backend Sunucusu Başlatılıyor (Port 3000)
echo ===============================================
echo.
cd /d c:\Users\Zımbacı\Desktop\itemci-project\backend
node server.js
pause
