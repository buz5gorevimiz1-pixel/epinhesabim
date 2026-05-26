@echo off
title MongoDB Kontrol
chcp 65001 > nul
cls
echo ===============================================
echo MongoDB Sunucu Durumu Kontrol
echo ===============================================
echo.
echo Kontrol ediliyor... (Port 27017)
netstat -ano | findstr :27017
if %errorlevel% equ 0 (
    echo.
    echo ✓ MongoDB ÇALIŞIYOR
) else (
    echo.
    echo ✗ MongoDB ÇALIŞMIYOR
    echo.
    echo MongoDB'yi başlatmak için:
    echo   mongod
    echo.
    echo Ya da Windows Service olarak:
    echo   net start MongoDB
)
echo.
pause
