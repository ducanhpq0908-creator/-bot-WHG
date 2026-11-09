module.exports = {
 name: "uptime", description: "Xem thời gian chạy tiến trình", role: "all",
 async execute(api, message, args, config) {
   const s = Math.floor(process.uptime());
   const d = Math.floor(s/86400), h = Math.floor(s%86400/3600);
   const m = Math.floor(s%3600/60), sec = s%60;
   await api.sendMessage(`⏱️ DUCANH BOT đã chạy: ${d} ngày ${h} giờ ${m} phút ${sec} giây`, message.threadId, message.type);
 }
};