@echo off
title ItemCI - NPM Dependencies Kurulum
chcp 65001 > nul
cls
echo ===============================================
echo ItemCI - NPM Dependencies Kurulum
echo ===============================================
echo.
echo [1/2] Sistem Kontrol Ediliyor...
node --version
npm --version
echo.
echo [2/2] Dependencies Yükleniyor...
cd /d c:\Users\Zımbacı\Desktop\itemci-project
npm install
echo.
echo ===============================================
echo Kurulum Tamamlandı!
echo ===============================================
echo.
echo Şimdi backend'i başlat:
echo   BASLA-BACKEND.cmd
echo.
pause
