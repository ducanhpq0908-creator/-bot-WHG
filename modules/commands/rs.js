const fs = require("fs");
const path = require("path");

module.exports = {
    name: "rs",
    description: "Khởi động lại Bot (Admin)",
    role: "admin",
    execute: async (api, message, args, config) => {
        try {
            // Lưu thông tin nhóm với đường dẫn tuyệt đối để không bị lỗi
            const rPath = path.join(__dirname, "..", "..", "restart_info.json");
            fs.writeFileSync(rPath, JSON.stringify({ threadId: message.threadId, type: message.type }));

            await api.sendMessage("🔄 Bot đang khởi động lại, vui lòng đợi...", message.threadId, message.type);
            
            console.log("\n\x1b[95m[!] Đang dừng hoạt động để khởi động lại...\x1b[0m");
            
            // Chờ 1.5 giây để chắc chắn Zalo đã nhận tin nhắn và file đã lưu xong
            setTimeout(() => { process.exit(0); }, 1500);
        } catch (e) {
            console.error("Lỗi khi RS:", e);
        }
    }
};
