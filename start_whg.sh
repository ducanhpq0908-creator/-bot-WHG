#!/data/data/com.termux/files/usr/bin/bash
cd "$HOME/WHG" || exit 1

# Xóa nội dung terminal cũ
clear
printf '\033[?25l'

# Khởi chạy bot, ẩn output cũ khỏi màn hình
node main.js 2>&1 | while IFS= read -r line; do
    case "$line" in
        *"Đang kết nối tới Zalo"*|*"Logged in as"*|*"Đăng nhập thành công"*|*"Prefix:"*|*"Đã sẵn sàng"*|*"listener"*)
            printf '\r\033[2K%s\n' "$line"
            ;;
        *"ERROR"*|*"LỖI"*|*"thất bại"*)
            printf '\r\033[2K%s\n' "$line"
            ;;
    esac
done
