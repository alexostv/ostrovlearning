@echo off
chcp 65001 > nul
title Локальный сервер курса испанского
echo.
echo ================================================
echo   Локальный сервер курса испанского
echo ================================================
echo.
echo После запуска открой в браузере:
echo.
echo     http://localhost:8000
echo.
echo Чтобы остановить сервер, закрой это окно
echo или нажми Ctrl+C
echo.
echo ================================================
echo.

cd /d "%~dp0"

python --version > nul 2>&1
if %errorlevel% == 0 (
    python -m http.server 8000
    goto :end
)

py --version > nul 2>&1
if %errorlevel% == 0 (
    py -m http.server 8000
    goto :end
)

echo.
echo [ОШИБКА] Python не найден на этом компьютере.
echo.
echo Установи Python с https://www.python.org/downloads/
echo Во время установки поставь галочку "Add Python to PATH".
echo.
pause

:end
