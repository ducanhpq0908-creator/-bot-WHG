#!/data/data/com.termux/files/usr/bin/bash
cd "$(dirname "$0")"
while true; do
    node main.js
    echo "[!] Tiến trình đóng. Khởi động lại sau 1 giây..."
    sleep 1
done
