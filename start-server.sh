#!/bin/bash
# Локальный сервер курса испанского

cd "$(dirname "$0")"

echo ""
echo "================================================"
echo "  Локальный сервер курса испанского"
echo "================================================"
echo ""
echo "После запуска открой в браузере:"
echo ""
echo "    http://localhost:8000"
echo ""
echo "Чтобы остановить сервер, нажми Ctrl+C"
echo ""
echo "================================================"
echo ""

if command -v python3 >/dev/null 2>&1; then
    python3 -m http.server 8000
elif command -v python >/dev/null 2>&1; then
    python -m http.server 8000
else
    echo ""
    echo "[ОШИБКА] Python не найден."
    echo ""
    echo "Установи Python с https://www.python.org/downloads/"
    echo ""
    exit 1
fi
