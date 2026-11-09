module.exports = {
    name: "confirmgold",
    description: "Xác nhận nhận quyền Trưởng nhóm",
    role: "user",
    execute: async (api, message, args, config) => {
        const threadId = message.threadId;
        const senderUid = String(message.data.uidFrom || "");
        
        const key = args[0];
        if (!key || !key.startsWith("GOLD-")) return api.sendMessage("❌ Key không hợp lệ.", threadId, message.type);

        const fs = require("fs");
        const path = require("path");
        const KEYS_FILE = path.join(__dirname, "..", "cache", "keys_data.json");
        
        let keysData = {};
        try { keysData = JSON.parse(fs.readFileSync(KEYS_FILE, "utf8")); } catch {}

        if (!keysData[key]) return api.sendMessage("❌ Key này không tồn tại.", threadId, message.type);
        if (keysData[key].type !== "gold") return api.sendMessage("❌ Đây không phải Key Vàng.", threadId, message.type);

        // Thử chuyển nhượng
        try {
            await api.changeGroupOwner(senderUid, threadId);
            return api.sendMessage(`👑 Chúc mừng! Bạn đã trở thành Trưởng nhóm mới.`, threadId, message.type);
        } catch (e) {
            return api.sendMessage(`⚠️ Zalo từ chối chuyển quyền tự động: ${e.message}\nVui lòng nhờ Admin chuyển tay trên App.`, threadId, message.type);
        }
    }
};
