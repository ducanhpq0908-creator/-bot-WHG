module.exports = {
 name: "help", description: "Danh sách 10 lệnh DUCANH BOT", role: "all",
 async execute(api, message, args, config) {
   const text = [
    "🤖 DUCANH BOT — LỆNH MỚI",
    "!dbping — Kiểm tra phản hồi",
    "!dbuptime — Thời gian chạy",
    "!dbinfo — Thông tin runtime",
    "!dbupper nội dung — Chữ hoa",
    "!db lower nội dung — Chữ thường",
    "!dbreverse nội dung — Đảo văn bản",
    "!dbcount nội dung — Đếm ký tự/từ",
    "!dbroll 100 — Random số 1–100",
    "!dbchoose A | B | C — Chọn ngẫu nhiên",
    "!dbhelp — Xem hướng dẫn"
   ].join("\n");
   await api.sendMessage(text, message.threadId, message.type);
 }
};