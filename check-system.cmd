@echo off
echo Checking MongoDB on port 27017...
netstat -ano | findstr :27017
echo.
echo Checking Node.js installation...
node --version
npm --version
echo.
echo Checking npm dependencies...
cd /d c:\Users\Zımbacı\Desktop\itemci-project
if not exist node_modules (
    echo Installing dependencies...
    npm install
) else (
    echo Dependencies already installed
)
echo.
pause
