#!/bin/bash
# ==========================================
# SCRIPT CÀI ĐẶT VÀ CHẠY BOT ZALO TỰ ĐỘNG
# Chạy lệnh: ./setup.sh
# ==========================================

# Dừng script ngay nếu có lỗi
set -e

echo "==========================================="
echo "   BẮT ĐẦU CÀI ĐẶT MÔI TRƯỜNG VÀ CHẠY BOT   "
echo "==========================================="

# 1. Kiểm tra Node.js
if ! command -v node &> /dev/null; then
    echo "[!] Không tìm thấy Node.js. Đang tiến hành cài đặt..."
    pkg update -y
    pkg install -y nodejs-lts
else
    echo "[+] Node.js đã được cài đặt: $(node -v)"
fi

# 2. Cài đặt thư viện (npm install)
echo "[*] Đang cài đặt các gói phụ thuộc (npm install)..."
if [ -f "package.json" ]; then
    npm install --no-audit --no-fund
else
    echo "[!] CẢNH BÁO: Không tìm thấy file package.json!"
fi

# 3. Cấp quyền thực thi cho các file .sh (nếu có)
echo "[*] Cấp quyền thực thi..."
chmod +x *.sh 2>/dev/null || true

# 4. Khởi chạy Bot
echo "==========================================="
echo "   CÀI ĐẶT HOÀN TẤT. ĐANG KHỞI CHẠY BOT... "
echo "==========================================="

# Chạy main.js
if [ -f "main.js" ]; then
    node main.js
else
    echo "[!] LỖI: Không tìm thấy file main.js để chạy."
    exit 1
fi
